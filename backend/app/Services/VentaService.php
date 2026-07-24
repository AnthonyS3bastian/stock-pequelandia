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
         * El ID del usuario nunca se recibe desde Angular.
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

        /*
         * Normalizar y validar el tipo de comprobante.
         */
        $tipoComprobante = strtoupper(
            trim(
                (string) (
                    $datos['tipo_comprobante']
                    ?? ''
                )
            )
        );

        $tiposPermitidos = [
            'VENTA RAPIDA',
            'BOLETA',
            'FACTURA',
        ];

        if (
            !in_array(
                $tipoComprobante,
                $tiposPermitidos,
                true
            )
        ) {
            throw ValidationException::withMessages([
                'tipo_comprobante' => [
                    'El tipo de comprobante no es válido.',
                ],
            ]);
        }

        /*
         * Conservar solamente los números del documento.
         */
        $numeroDocumento = preg_replace(
            '/\D+/',
            '',
            (string) (
                $datos['numero_documento']
                ?? ''
            )
        );

        $numeroDocumento =
            $numeroDocumento ?? '';

        /*
         * Validar y consultar el documento antes de iniciar
         * la transacción.
         *
         * Así no mantenemos bloqueada la base de datos
         * mientras responde un servicio externo.
         */
        $datosClienteConsultado =
            $this->consultarClienteSegunComprobante(
                $tipoComprobante,
                $numeroDocumento
            );

        /*
         * Obtener y validar los detalles antes de bloquear
         * registros en la base de datos.
         */
        $detallesRecibidos =
            $datos['detalles']
            ?? $datos['productos']
            ?? [];

        $cantidadesPorProducto =
            $this->normalizarDetalles(
                $detallesRecibidos
            );

        /*
         * Toda la operación se ejecuta como una sola transacción.
         *
         * Si falla la venta, un detalle, el stock o la serie,
         * Laravel revierte todo automáticamente.
         */
        $venta = DB::transaction(
            function () use (
                $idUsuario,
                $tipoComprobante,
                $datosClienteConsultado,
                $cantidadesPorProducto
            ): Venta {

                /*
                 * Confirmar que el usuario continúe activo.
                 *
                 * Se bloquea temporalmente para evitar que su
                 * estado cambie mientras registra la venta.
                 */
                $usuario = Usuario::query()
                    ->where(
                        'id_usuario',
                        $idUsuario
                    )
                    ->lockForUpdate()
                    ->first();

                if (!$usuario) {
                    throw ValidationException::withMessages([
                        'usuario' => [
                            'El usuario autenticado ya no existe.',
                        ],
                    ]);
                }

                if (!$usuario->estado_usuario) {
                    throw ValidationException::withMessages([
                        'usuario' => [
                            'El usuario autenticado se encuentra inactivo.',
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
                                $datosClienteConsultado
                                ?? []
                            ),

                    'FACTURA' =>
                        $this->clienteService
                            ->guardarClienteEmpresa(
                                $datosClienteConsultado
                                ?? []
                            ),
                };

                if (!$cliente) {
                    throw ValidationException::withMessages([
                        'cliente' => [
                            'No se pudo resolver el cliente de la venta.',
                        ],
                    ]);
                }

                /*
                 * Buscar y bloquear la serie correspondiente.
                 *
                 * VENTA RAPIDA -> NV001
                 * BOLETA       -> B001
                 * FACTURA      -> F001
                 */
                $serieComprobante =
                    SerieComprobante::query()
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

                $serieDocumento = trim(
                    (string) $serieComprobante
                        ->serie_documento
                );

                if ($serieDocumento === '') {
                    throw ValidationException::withMessages([
                        'serie_comprobante' => [
                            'La serie del comprobante no se encuentra configurada.',
                        ],
                    ]);
                }

                $numeroCorrelativo =
                    (int) $serieComprobante
                        ->numero_correlativo;

                if ($numeroCorrelativo <= 0) {
                    throw ValidationException::withMessages([
                        'serie_comprobante' => [
                            'El número correlativo de la serie no es válido.',
                        ],
                    ]);
                }

                $productosVenta = [];

                $totalVenta = 0;

                /*
                 * Consultar, bloquear y validar los productos.
                 *
                 * Los IDs ya se encuentran ordenados para que
                 * todas las ventas bloqueen los productos en
                 * el mismo orden.
                 */
                foreach (
                    $cantidadesPorProducto
                    as $idProducto => $cantidad
                ) {
                    $producto = Producto::query()
                        ->where(
                            'id_producto',
                            $idProducto
                        )
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

                    $stockDisponible =
                        (int) $producto
                            ->stock_producto;

                    if ($stockDisponible < $cantidad) {
                        throw ValidationException::withMessages([
                            'stock' => [
                                "Stock insuficiente para {$producto->nombre_producto}. "
                                . "Disponible: {$stockDisponible}. "
                                . "Solicitado: {$cantidad}.",
                            ],
                        ]);
                    }

                    if (
                        !is_numeric(
                            $producto->precio_producto
                        )
                        || (float) $producto
                            ->precio_producto <= 0
                    ) {
                        throw ValidationException::withMessages([
                            'precio' => [
                                "El producto {$producto->nombre_producto} no tiene un precio de venta válido.",
                            ],
                        ]);
                    }

                    if (
                        !is_numeric(
                            $producto->costo_producto
                        )
                        || (float) $producto
                            ->costo_producto < 0
                    ) {
                        throw ValidationException::withMessages([
                            'costo' => [
                                "El producto {$producto->nombre_producto} no tiene un costo válido.",
                            ],
                        ]);
                    }

                    $precioUnitario = round(
                        (float) $producto
                            ->precio_producto,
                        2
                    );

                    $costoUnitario = round(
                        (float) $producto
                            ->costo_producto,
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
                        'producto' =>
                            $producto,

                        'cantidad' =>
                            $cantidad,

                        'precio_unitario' =>
                            $precioUnitario,

                        'costo_unitario' =>
                            $costoUnitario,
                    ];
                }

                if ($totalVenta <= 0) {
                    throw ValidationException::withMessages([
                        'total_venta' => [
                            'El total de la venta debe ser mayor que cero.',
                        ],
                    ]);
                }

                /*
                 * Generar el número del comprobante.
                 *
                 * Ejemplos:
                 * NV001-00000003
                 * B001-00000001
                 * F001-00000001
                 */
                $numeroComprobante =
                    $serieDocumento
                    . '-'
                    . str_pad(
                        (string) $numeroCorrelativo,
                        8,
                        '0',
                        STR_PAD_LEFT
                    );

                if (
                    strlen($numeroComprobante) > 20
                ) {
                    throw ValidationException::withMessages([
                        'numero_comprobante' => [
                            'El número de comprobante supera los 20 caracteres permitidos.',
                        ],
                    ]);
                }

                /*
                 * Registrar la cabecera de la venta.
                 *
                 * now() utilizará la zona horaria configurada
                 * en Laravel.
                 */
                $venta = Venta::create([
                    'fecha_venta' =>
                        now(),

                    'numero_comprobante' =>
                        $numeroComprobante,

                    'total_venta' =>
                        $totalVenta,

                    'id_usuario' =>
                        $idUsuario,

                    'id_serie_comprobante' =>
                        $serieComprobante
                            ->id_serie_comprobante,

                    'id_cliente' =>
                        $cliente->id_cliente,
                ]);

                /*
                 * Registrar cada detalle y descontar el stock.
                 */
                foreach (
                    $productosVenta
                    as $productoVenta
                ) {
                    /** @var Producto $producto */
                    $producto =
                        $productoVenta['producto'];

                    $cantidad =
                        (int) $productoVenta[
                            'cantidad'
                        ];

                    $precioUnitario =
                        (float) $productoVenta[
                            'precio_unitario'
                        ];

                    $costoUnitario =
                        (float) $productoVenta[
                            'costo_unitario'
                        ];

                    DetalleVenta::create([
                        'precio_publico_venta' =>
                            $precioUnitario,

                        'costo_detalle_venta' =>
                            $costoUnitario,

                        'cantidad_detalle_venta' =>
                            $cantidad,

                        'id_producto' =>
                            $producto
                                ->id_producto,

                        'id_venta' =>
                            $venta
                                ->id_venta,
                    ]);

                    $producto->stock_producto =
                        (int) $producto
                            ->stock_producto
                        - $cantidad;

                    $producto->save();
                }

                /*
                 * Incrementar el correlativo únicamente después
                 * de registrar correctamente la venta.
                 */
                $serieComprobante
                    ->numero_correlativo =
                        $numeroCorrelativo + 1;

                $serieComprobante->save();

                /*
                 * Cargar las relaciones dentro de la transacción.
                 *
                 * Si alguna consulta falla, todavía puede
                 * revertirse la operación completa.
                 */
                $venta->load([
                    'usuario',
                    'cliente',
                    'serieComprobante',
                    'detalleVentas.producto',
                ]);

                return $venta;
            }
        );

        return [
            'mensaje' =>
                'Venta registrada correctamente.',

            'venta' =>
                $venta,
        ];
    }

    /**
     * Consultar y validar al cliente según el comprobante.
     */
    private function consultarClienteSegunComprobante(
        string $tipoComprobante,
        string $numeroDocumento
    ): ?array {
        if (
            $tipoComprobante ===
            'VENTA RAPIDA'
        ) {
            return null;
        }

        if ($tipoComprobante === 'BOLETA') {
            if (
                !preg_match(
                    '/^\d{8}$/',
                    $numeroDocumento
                )
            ) {
                throw ValidationException::withMessages([
                    'numero_documento' => [
                        'El DNI debe contener exactamente 8 dígitos.',
                    ],
                ]);
            }

            $datosCliente =
                $this->consultaDocumentoService
                    ->consultarDni(
                        $numeroDocumento
                    );

            $dniDevuelto = preg_replace(
                '/\D+/',
                '',
                (string) (
                    $datosCliente['dni']
                    ?? ''
                )
            );

            $dniDevuelto =
                $dniDevuelto ?? '';

            $nombres = trim(
                (string) (
                    $datosCliente['nombres']
                    ?? ''
                )
            );

            if (
                $dniDevuelto !==
                $numeroDocumento
                || $nombres === ''
            ) {
                throw ValidationException::withMessages([
                    'numero_documento' => [
                        'No se encontró información válida para el DNI ingresado.',
                    ],
                ]);
            }

            return $datosCliente;
        }

        if (
            !preg_match(
                '/^\d{11}$/',
                $numeroDocumento
            )
        ) {
            throw ValidationException::withMessages([
                'numero_documento' => [
                    'El RUC debe contener exactamente 11 dígitos.',
                ],
            ]);
        }

        $datosCliente =
            $this->consultaDocumentoService
                ->consultarRuc(
                    $numeroDocumento
                );

        $rucDevuelto = preg_replace(
            '/\D+/',
            '',
            (string) (
                $datosCliente['ruc']
                ?? ''
            )
        );

        $rucDevuelto =
            $rucDevuelto ?? '';

        $razonSocial = trim(
            (string) (
                $datosCliente['razonSocial']
                ?? ''
            )
        );

        if (
            $rucDevuelto !==
            $numeroDocumento
            || $razonSocial === ''
        ) {
            throw ValidationException::withMessages([
                'numero_documento' => [
                    'No se encontró información válida para el RUC ingresado.',
                ],
            ]);
        }

        /*
         * Esta validación también debe existir en Laravel.
         *
         * No basta con bloquearlo visualmente en Angular,
         * porque una petición podría enviarse directamente.
         */
        $estadoRuc = strtoupper(
            trim(
                (string) (
                    $datosCliente['estado']
                    ?? ''
                )
            )
        );

        $condicionRuc = strtoupper(
            trim(
                (string) (
                    $datosCliente['condicion']
                    ?? ''
                )
            )
        );

        if ($estadoRuc !== 'ACTIVO') {
            throw ValidationException::withMessages([
                'numero_documento' => [
                    "El RUC consultado tiene estado {$estadoRuc} y no puede utilizarse para registrar la factura.",
                ],
            ]);
        }

        if ($condicionRuc !== 'HABIDO') {
            throw ValidationException::withMessages([
                'numero_documento' => [
                    "El RUC consultado tiene condición {$condicionRuc} y no puede utilizarse para registrar la factura.",
                ],
            ]);
        }

        return $datosCliente;
    }

    /**
     * Validar y agrupar los productos repetidos.
     */
    private function normalizarDetalles(
        mixed $detallesRecibidos
    ): array {
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

        $cantidadesPorProducto = [];

        foreach (
            $detallesRecibidos
            as $indice => $detalleRecibido
        ) {
            if (!is_array($detalleRecibido)) {
                throw ValidationException::withMessages([
                    "detalles.{$indice}" => [
                        'El detalle del producto no tiene un formato válido.',
                    ],
                ]);
            }

            $idProducto =
                $detalleRecibido[
                    'id_producto'
                ]
                ?? null;

            $cantidadRecibida =
                $detalleRecibido[
                    'cantidad'
                ]
                ?? $detalleRecibido[
                    'cantidad_detalle_venta'
                ]
                ?? null;

            if (
                !is_numeric($idProducto)
                || (int) $idProducto <= 0
                || (int) $idProducto
                    != (float) $idProducto
            ) {
                throw ValidationException::withMessages([
                    "detalles.{$indice}.id_producto" => [
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
                    "detalles.{$indice}.cantidad" => [
                        'La cantidad debe ser un número entero mayor que cero.',
                    ],
                ]);
            }

            $idProducto =
                (int) $idProducto;

            $cantidad =
                (int) $cantidadRecibida;

            if (
                !isset(
                    $cantidadesPorProducto[
                        $idProducto
                    ]
                )
            ) {
                $cantidadesPorProducto[
                    $idProducto
                ] = 0;
            }

            $cantidadesPorProducto[
                $idProducto
            ] += $cantidad;
        }

        /*
         * Mantener un orden constante de bloqueo
         * reduce el riesgo de interbloqueos.
         */
        ksort($cantidadesPorProducto);

        return $cantidadesPorProducto;
    }
}