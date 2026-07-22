<?php

namespace App\Services;

use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\SerieComprobante;
use App\Models\Usuario;
use App\Models\Venta;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

class VentaService
{
    public function __construct(
        private ConsultaDocumentoService $consultaDocumentoService,
        private ClienteService $clienteService
    ) {
    }

    /**
     * Registrar una nueva venta.
     */
    public function registrar(array $datos): array
    {
        /*
         * Obtener al usuario autenticado mediante Laravel Sanctum.
         *
         * El ID del usuario ya no se recibe desde Angular
         * ni se mantiene con un valor fijo.
         */
        $usuarioAutenticado = Auth::user();

        if (!$usuarioAutenticado instanceof Usuario) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'No existe un usuario autenticado para registrar la venta.',
                ],
            ]);
        }

        if (!$usuarioAutenticado->estado_usuario) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'El usuario autenticado se encuentra inactivo.',
                ],
            ]);
        }

        $idUsuario = (int) $usuarioAutenticado->id_usuario;

        $tipoComprobante = strtoupper(
            trim((string) ($datos['tipo_comprobante'] ?? ''))
        );

        $numeroDocumento = preg_replace(
            '/\D/',
            '',
            (string) ($datos['numero_documento'] ?? '')
        );

        /*
         * Consultar APIsPERU antes de iniciar la transacción.
         *
         * Esto evita mantener bloqueadas las tablas mientras
         * esperamos la respuesta de un servicio externo.
         */
        $datosClienteConsultado = null;

        if ($tipoComprobante === 'BOLETA') {
            $datosClienteConsultado =
                $this->consultaDocumentoService
                    ->consultarDni($numeroDocumento);

            if (
                !isset($datosClienteConsultado['dni'])
                || !isset($datosClienteConsultado['nombres'])
            ) {
                throw ValidationException::withMessages([
                    'numero_documento' => [
                        'APIsPERU no devolvió información válida para el DNI.',
                    ],
                ]);
            }
        }

        if ($tipoComprobante === 'FACTURA') {
            $datosClienteConsultado =
                $this->consultaDocumentoService
                    ->consultarRuc($numeroDocumento);

            if (
                !isset($datosClienteConsultado['ruc'])
                || !isset($datosClienteConsultado['razonSocial'])
            ) {
                throw ValidationException::withMessages([
                    'numero_documento' => [
                        'APIsPERU no devolvió información válida para el RUC.',
                    ],
                ]);
            }
        }

        DB::beginTransaction();

        try {
            /*
             * Verificar que el usuario autenticado siga existiendo.
             */
            $usuarioExiste = Usuario::query()
                ->where('id_usuario', $idUsuario)
                ->where('estado_usuario', true)
                ->exists();

            if (!$usuarioExiste) {
                throw ValidationException::withMessages([
                    'usuario' => [
                        'El usuario autenticado no existe o se encuentra inactivo.',
                    ],
                ]);
            }

            /*
             * Resolver el cliente según el comprobante.
             */
            $cliente = match ($tipoComprobante) {
                'VENTA RAPIDA' =>
                    $this->clienteService
                        ->obtenerPublicoGeneral(),

                'BOLETA' =>
                    $this->clienteService
                        ->guardarClienteNatural(
                            $datosClienteConsultado ?? []
                        ),

                'FACTURA' =>
                    $this->clienteService
                        ->guardarClienteEmpresa(
                            $datosClienteConsultado ?? []
                        ),

                default =>
                    throw ValidationException::withMessages([
                        'tipo_comprobante' => [
                            'El tipo de comprobante no es válido.',
                        ],
                    ]),
            };

            /*
             * Buscar la serie correspondiente al tipo de comprobante.
             *
             * VENTA RAPIDA -> NV001
             * BOLETA       -> B001
             * FACTURA      -> F001
             */
            $serieComprobante = SerieComprobante::query()
                ->where(
                    'tipo_documento_serie',
                    $tipoComprobante
                )
                ->lockForUpdate()
                ->first();

            if (!$serieComprobante) {
                throw ValidationException::withMessages([
                    'tipo_comprobante' => [
                        "No existe una serie configurada para {$tipoComprobante}.",
                    ],
                ]);
            }

            /*
             * Obtener los productos enviados.
             */
            $detallesRecibidos = $datos['detalles']
                ?? $datos['productos']
                ?? [];

            if (
                !is_array($detallesRecibidos)
                || count($detallesRecibidos) === 0
            ) {
                throw ValidationException::withMessages([
                    'detalles' => [
                        'La venta debe contener al menos un producto.',
                    ],
                ]);
            }

            /*
             * Agrupar los productos repetidos.
             */
            $cantidadesPorProducto = [];

            foreach (
                $detallesRecibidos as $indice => $detalleRecibido
            ) {
                if (!is_array($detalleRecibido)) {
                    throw ValidationException::withMessages([
                        "detalles.$indice" => [
                            'El detalle del producto no tiene un formato válido.',
                        ],
                    ]);
                }

                $idProducto =
                    $detalleRecibido['id_producto'] ?? null;

                $cantidadRecibida =
                    $detalleRecibido['cantidad']
                    ?? $detalleRecibido[
                        'cantidad_detalle_venta'
                    ]
                    ?? null;

                if (
                    !is_numeric($idProducto)
                    || (int) $idProducto <= 0
                ) {
                    throw ValidationException::withMessages([
                        "detalles.$indice.id_producto" => [
                            'El producto seleccionado no es válido.',
                        ],
                    ]);
                }

                if (
                    !is_numeric($cantidadRecibida)
                    || (float) $cantidadRecibida <= 0
                    || (int) $cantidadRecibida
                        != (float) $cantidadRecibida
                ) {
                    throw ValidationException::withMessages([
                        "detalles.$indice.cantidad" => [
                            'La cantidad debe ser un número entero mayor que cero.',
                        ],
                    ]);
                }

                $idProducto = (int) $idProducto;
                $cantidad = (int) $cantidadRecibida;

                if (
                    !isset(
                        $cantidadesPorProducto[$idProducto]
                    )
                ) {
                    $cantidadesPorProducto[$idProducto] = 0;
                }

                $cantidadesPorProducto[$idProducto] +=
                    $cantidad;
            }

            /*
             * Mantener un orden constante de bloqueo.
             */
            ksort($cantidadesPorProducto);

            $productosVenta = [];
            $totalVenta = 0;

            /*
             * Consultar, bloquear y validar los productos.
             */
            foreach (
                $cantidadesPorProducto
                as $idProducto => $cantidad
            ) {
                $producto = Producto::query()
                    ->where('id_producto', $idProducto)
                    ->lockForUpdate()
                    ->first();

                if (!$producto) {
                    throw ValidationException::withMessages([
                        'productos' => [
                            "No existe el producto con ID {$idProducto}.",
                        ],
                    ]);
                }

                if (!$producto->estado) {
                    throw ValidationException::withMessages([
                        'productos' => [
                            "El producto {$producto->nombre_producto} se encuentra inactivo.",
                        ],
                    ]);
                }

                if (
                    $producto->stock_producto < $cantidad
                ) {
                    throw ValidationException::withMessages([
                        'stock' => [
                            "Stock insuficiente para {$producto->nombre_producto}. "
                            . "Disponible: {$producto->stock_producto}. "
                            . "Solicitado: {$cantidad}.",
                        ],
                    ]);
                }

                $precioUnitario = round(
                    (float) $producto->precio_producto,
                    2
                );

                $subtotal = round(
                    $precioUnitario * $cantidad,
                    2
                );

                $totalVenta = round(
                    $totalVenta + $subtotal,
                    2
                );

                $productosVenta[] = [
                    'producto' => $producto,
                    'cantidad' => $cantidad,
                    'precio_unitario' => $precioUnitario,
                ];
            }

            /*
             * Generar el número del comprobante.
             *
             * Ejemplos:
             * NV001-00000003
             * B001-00000001
             * F001-00000001
             */
            $numeroCorrelativo =
                (int) $serieComprobante
                    ->numero_correlativo;

            $numeroComprobante =
                $serieComprobante->serie_documento
                . '-'
                . str_pad(
                    (string) $numeroCorrelativo,
                    8,
                    '0',
                    STR_PAD_LEFT
                );

            if (strlen($numeroComprobante) > 20) {
                throw ValidationException::withMessages([
                    'numero_comprobante' => [
                        'El número de comprobante supera los 20 caracteres permitidos.',
                    ],
                ]);
            }

            /*
             * Registrar la cabecera de la venta.
             */
            $venta = Venta::create([
                'fecha_venta' => now(),
                'numero_comprobante' =>
                    $numeroComprobante,
                'total_venta' => $totalVenta,
                'id_usuario' => $idUsuario,
                'id_serie_comprobante' =>
                    $serieComprobante
                        ->id_serie_comprobante,
                'id_cliente' =>
                    $cliente->id_cliente,
            ]);

            /*
             * Registrar los detalles y descontar stock.
             */
            foreach (
                $productosVenta as $productoVenta
            ) {
                /** @var Producto $producto */
                $producto =
                    $productoVenta['producto'];

                $cantidad =
                    $productoVenta['cantidad'];

                $precioUnitario =
                    $productoVenta[
                        'precio_unitario'
                    ];

                DetalleVenta::create([
                    'precio_publico_venta' =>
                        $precioUnitario,

                    'costo_detalle_venta' => round(
                        (float) $producto
                            ->costo_producto,
                        2
                    ),

                    'cantidad_detalle_venta' =>
                        $cantidad,

                    'id_producto' =>
                        $producto->id_producto,

                    'id_venta' =>
                        $venta->id_venta,
                ]);

                $producto->stock_producto =
                    $producto->stock_producto
                    - $cantidad;

                $producto->save();
            }

            /*
             * Incrementar el correlativo de la serie utilizada.
             */
            $serieComprobante->numero_correlativo =
                $numeroCorrelativo + 1;

            $serieComprobante->save();

            DB::commit();

            /*
             * Recargar la venta con todas sus relaciones.
             */
            $venta->load([
                'usuario',
                'cliente',
                'serieComprobante',
                'detalleVentas.producto',
            ]);

            return [
                'mensaje' =>
                    'Venta registrada correctamente.',

                'venta' => $venta,
            ];
        } catch (Throwable $e) {
            DB::rollBack();

            throw $e;
        }
    }
}