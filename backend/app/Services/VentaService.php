<?php

namespace App\Services;

use App\Models\DetalleVenta;
use App\Models\DetalleVentaLote;
use App\Models\LoteProducto;
use App\Models\Producto;
use App\Models\SerieComprobante;
use App\Models\Usuario;
use App\Models\Venta;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VentaService
{
    private const ZONA_HORARIA =
        'America/Lima';

    private const ESTADO_REGISTRADA =
        'REGISTRADA';

    private const ESTADO_ANULADA =
        'ANULADA';

    private const SERIE_NOTA_VENTA =
        'NV001';

    public function __construct(
        private ConsultaDocumentoService $consultaDocumentoService,
        private ClienteService $clienteService
    ) {
    }

    /**
     * Registrar una nueva venta.
     */
    public function registrar(
        array $datos
    ): array {

        $usuarioAutenticado =
            $this->obtenerUsuarioAutenticado();

        $idUsuario =
            (int) $usuarioAutenticado
                ->id_usuario;

        /*
         * Valores internos mantenidos
         * por compatibilidad:
         *
         * VENTA RAPIDA = Publico general
         * BOLETA       = Cliente con DNI
         * FACTURA      = Cliente con RUC
         *
         * Todos generan una Nota de Venta.
         */
        $tipoCliente =
            strtoupper(
                trim(
                    (string) (
                        $datos[
                            'tipo_comprobante'
                        ]
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
                $tipoCliente,
                $tiposPermitidos,
                true
            )
        ) {

            throw ValidationException::withMessages([
                'tipo_comprobante' => [
                    'El tipo de cliente no es valido.',
                ],
            ]);
        }

        $numeroDocumento =
            preg_replace(
                '/\D+/',
                '',
                (string) (
                    $datos[
                        'numero_documento'
                    ]
                    ?? ''
                )
            );

        $numeroDocumento =
            $numeroDocumento
            ?? '';

        /*
         * La consulta externa se ejecuta
         * antes de abrir la transaccion.
         */
        $datosClienteConsultado =
            $this
                ->consultarClienteSegunTipo(
                    $tipoCliente,
                    $numeroDocumento
                );

        $detallesRecibidos =
            $datos['detalles']
            ?? $datos['productos']
            ?? [];

        $cantidadesPorProducto =
            $this->normalizarDetalles(
                $detallesRecibidos
            );

        $venta =
            DB::transaction(
                function () use (
                    $idUsuario,
                    $tipoCliente,
                    $datosClienteConsultado,
                    $cantidadesPorProducto
                ): Venta {

                    /*
                     * Bloquear usuario.
                     */
                    $usuario =
                        Usuario::query()
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

                    if (
                        !$usuario
                            ->estado_usuario
                    ) {

                        throw ValidationException::withMessages([
                            'usuario' => [
                                'El usuario autenticado se encuentra inactivo.',
                            ],
                        ]);
                    }

                    /*
                     * Resolver cliente.
                     */
                    $cliente =
                        match (
                            $tipoCliente
                        ) {

                            'VENTA RAPIDA' =>
                                $this
                                    ->clienteService
                                    ->obtenerPublicoGeneral(),

                            'BOLETA' =>
                                $this
                                    ->clienteService
                                    ->guardarClienteNatural(
                                        $datosClienteConsultado
                                        ?? []
                                    ),

                            'FACTURA' =>
                                $this
                                    ->clienteService
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
                     * Serie unica para Nota de Venta.
                     */
                    $serieComprobante =
                        SerieComprobante::query()
                            ->where(
                                'serie_documento',
                                self::SERIE_NOTA_VENTA
                            )
                            ->lockForUpdate()
                            ->first();

                    if (!$serieComprobante) {

                        throw ValidationException::withMessages([
                            'serie_comprobante' => [
                                'No existe la serie NV001 para las notas de venta.',
                            ],
                        ]);
                    }

                    $serieDocumento =
                        strtoupper(
                            preg_replace(
                                '/[^A-Z0-9]/',
                                '',
                                trim(
                                    (string)
                                    $serieComprobante
                                        ->serie_documento
                                )
                            )
                            ?? ''
                        );

                    $numeroCorrelativo =
                        (int)
                        $serieComprobante
                            ->numero_correlativo;

                    if (
                        $serieDocumento === ''
                        || $numeroCorrelativo
                            <= 0
                    ) {

                        throw ValidationException::withMessages([
                            'serie_comprobante' => [
                                'La serie o el correlativo de la nota de venta no estan configurados correctamente.',
                            ],
                        ]);
                    }

                    /*
                     * Preparar productos y reservar
                     * sus lotes dentro de la transaccion.
                     */
                    $productosVenta = [];

                    $totalVenta = 0.0;

                    foreach (
                        $cantidadesPorProducto
                        as $idProducto =>
                        $cantidad
                    ) {

                        $producto =
                            Producto::query()
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

                        if (
                            !$producto->estado
                        ) {

                            throw ValidationException::withMessages([
                                'productos' => [
                                    "El producto {$producto->nombre_producto} se encuentra inactivo.",
                                ],
                            ]);
                        }

                        /*
                         * Primero validar el stock general
                         * que visualiza actualmente el sistema.
                         */
                        $stockRegistrado =
                            (int)
                            $producto
                                ->stock_producto;

                        if (
                            $stockRegistrado
                            < $cantidad
                        ) {

                            throw ValidationException::withMessages([
                                'stock' => [
                                    "Stock insuficiente para {$producto->nombre_producto}. "
                                    . "Disponible: {$stockRegistrado}. "
                                    . "Solicitado: {$cantidad}.",
                                ],
                            ]);
                        }

                        $precioUnitario =
                            round(
                                (float)
                                $producto
                                    ->precio_producto,
                                2
                            );

                        if (
                            $precioUnitario
                            <= 0
                        ) {

                            throw ValidationException::withMessages([
                                'precio' => [
                                    "El producto {$producto->nombre_producto} no tiene un precio de venta valido.",
                                ],
                            ]);
                        }

                        /*
                         * Obtener los lotes que atenderan
                         * esta venta mediante FIFO.
                         *
                         * Los lotes vencidos no pueden venderse.
                         */
                        $planConsumo =
                            $this
                                ->prepararConsumoLotes(
                                    $producto,
                                    $cantidad
                                );

                        $subtotal =
                            round(
                                $precioUnitario
                                * $cantidad,
                                2
                            );

                        $totalVenta =
                            round(
                                $totalVenta
                                + $subtotal,
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
                                $planConsumo[
                                    'costo_promedio'
                                ],

                            'consumos' =>
                                $planConsumo[
                                    'consumos'
                                ],
                        ];
                    }

                    if (
                        $totalVenta
                        <= 0
                    ) {

                        throw ValidationException::withMessages([
                            'total_venta' => [
                                'El total de la venta debe ser mayor que cero.',
                            ],
                        ]);
                    }

                    /*
                     * Ejemplo:
                     *
                     * NV00100000001
                     */
                    $numeroComprobante =
                        $serieDocumento
                        . str_pad(
                            (string)
                            $numeroCorrelativo,
                            8,
                            '0',
                            STR_PAD_LEFT
                        );

                    if (
                        strlen(
                            $numeroComprobante
                        )
                        > 20
                    ) {

                        throw ValidationException::withMessages([
                            'numero_comprobante' => [
                                'El codigo de la nota de venta supera los 20 caracteres permitidos.',
                            ],
                        ]);
                    }

                    /*
                     * Crear cabecera de venta.
                     */
                    $venta =
                        Venta::create([
                            'fecha_venta' =>
                                now(
                                    self::ZONA_HORARIA
                                ),

                            'numero_comprobante' =>
                                $numeroComprobante,

                            'total_venta' =>
                                $totalVenta,

                            'estado_venta' =>
                                self::ESTADO_REGISTRADA,

                            'id_usuario' =>
                                $idUsuario,

                            'id_serie_comprobante' =>
                                $serieComprobante
                                    ->id_serie_comprobante,

                            'id_cliente' =>
                                $cliente
                                    ->id_cliente,
                        ]);

                    /*
                     * Crear detalles y consumir lotes.
                     */
                    foreach (
                        $productosVenta
                        as $productoVenta
                    ) {

                        /** @var Producto $producto */
                        $producto =
                            $productoVenta[
                                'producto'
                            ];

                        $cantidad =
                            (int)
                            $productoVenta[
                                'cantidad'
                            ];

                        /*
                         * costo_detalle_venta conserva
                         * un costo promedio ponderado.
                         *
                         * El costo exacto por lote queda
                         * registrado en detalle_venta_lote.
                         */
                        $detalleVenta =
                            DetalleVenta::create([
                                'precio_publico_venta' =>
                                    (float)
                                    $productoVenta[
                                        'precio_unitario'
                                    ],

                                'costo_detalle_venta' =>
                                    (float)
                                    $productoVenta[
                                        'costo_unitario'
                                    ],

                                'cantidad_detalle_venta' =>
                                    $cantidad,

                                'id_producto' =>
                                    $producto
                                        ->id_producto,

                                'id_venta' =>
                                    $venta
                                        ->id_venta,
                            ]);

                        foreach (
                            $productoVenta[
                                'consumos'
                            ]
                            as $consumo
                        ) {

                            /** @var LoteProducto $lote */
                            $lote =
                                $consumo[
                                    'lote'
                                ];

                            $cantidadLote =
                                (int)
                                $consumo[
                                    'cantidad'
                                ];

                            $lote
                                ->cantidad_disponible =
                                    (int)
                                    $lote
                                        ->cantidad_disponible
                                    - $cantidadLote;

                            $lote->save();

                            DetalleVentaLote::create([
                                'id_detalle_venta' =>
                                    $detalleVenta
                                        ->id_detalle_venta,

                                'id_lote_producto' =>
                                    $lote
                                        ->id_lote_producto,

                                'cantidad' =>
                                    $cantidadLote,

                                'costo_unitario' =>
                                    (float)
                                    $consumo[
                                        'costo_unitario'
                                    ],
                            ]);
                        }

                        /*
                         * Mantener temporalmente sincronizado
                         * el stock general del producto.
                         */
                        $producto
                            ->stock_producto =
                                (int)
                                $producto
                                    ->stock_producto
                                - $cantidad;

                        $producto->save();
                    }

                    /*
                     * Incrementar correlativo.
                     */
                    $serieComprobante
                        ->numero_correlativo =
                            $numeroCorrelativo
                            + 1;

                    $serieComprobante
                        ->save();

                    $venta->load(
                        $this
                            ->relacionesCompletas()
                    );

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
     * Preparar el consumo FIFO de lotes.
     *
     * Solo considera:
     * - lotes activos
     * - cantidad disponible > 0
     * - lotes no vencidos
     */
    private function prepararConsumoLotes(
        Producto $producto,
        int $cantidad
    ): array {

        $hoy =
            now(
                self::ZONA_HORARIA
            )
                ->toDateString();

        $lotes =
            LoteProducto::query()
                ->where(
                    'id_producto',
                    $producto
                        ->id_producto
                )
                ->where(
                    'estado',
                    true
                )
                ->where(
                    'cantidad_disponible',
                    '>',
                    0
                )
                ->where(
                    function (
                        $consulta
                    ) use (
                        $hoy
                    ): void {

                        $consulta
                            ->whereNull(
                                'fecha_caducidad'
                            )
                            ->orWhereDate(
                                'fecha_caducidad',
                                '>=',
                                $hoy
                            );
                    }
                )
                ->orderBy(
                    'fecha_ingreso'
                )
                ->orderBy(
                    'id_lote_producto'
                )
                ->lockForUpdate()
                ->get();

        $stockVendible =
            (int)
            $lotes->sum(
                'cantidad_disponible'
            );

        if (
            $stockVendible
            < $cantidad
        ) {

            $stockTotal =
                (int)
                $producto
                    ->stock_producto;

            /*
             * Si existe stock general pero no
             * suficiente stock vendible, normalmente
             * significa que parte esta vencida.
             */
            if (
                $stockTotal
                >= $cantidad
            ) {

                throw ValidationException::withMessages([
                    'stock' => [
                        "El producto {$producto->nombre_producto} no posee suficiente stock vigente para vender. "
                        . "Stock vendible: {$stockVendible}. "
                        . "Solicitado: {$cantidad}.",
                    ],
                ]);
            }

            throw ValidationException::withMessages([
                'stock' => [
                    "Stock insuficiente para {$producto->nombre_producto}. "
                    . "Disponible: {$stockVendible}. "
                    . "Solicitado: {$cantidad}.",
                ],
            ]);
        }

        $cantidadPendiente =
            $cantidad;

        $consumos = [];

        $costoTotal =
            0.0;

        foreach (
            $lotes
            as $lote
        ) {

            if (
                $cantidadPendiente
                <= 0
            ) {
                break;
            }

            $disponible =
                (int)
                $lote
                    ->cantidad_disponible;

            $cantidadTomada =
                min(
                    $disponible,
                    $cantidadPendiente
                );

            if (
                $cantidadTomada
                <= 0
            ) {
                continue;
            }

            $costoUnitario =
                round(
                    (float)
                    $lote
                        ->costo_unitario,
                    2
                );

            $consumos[] = [
                'lote' =>
                    $lote,

                'cantidad' =>
                    $cantidadTomada,

                'costo_unitario' =>
                    $costoUnitario,
            ];

            $costoTotal =
                $costoTotal
                + (
                    $costoUnitario
                    * $cantidadTomada
                );

            $cantidadPendiente -=
                $cantidadTomada;
        }

        if (
            $cantidadPendiente
            > 0
        ) {

            throw ValidationException::withMessages([
                'stock' => [
                    "No se pudo completar el consumo de lotes para {$producto->nombre_producto}.",
                ],
            ]);
        }

        $costoPromedio =
            $cantidad > 0
                ? round(
                    $costoTotal
                    / $cantidad,
                    2
                )
                : 0.0;

        return [
            'consumos' =>
                $consumos,

            'costo_promedio' =>
                $costoPromedio,
        ];
    }

    /**
     * Buscar una venta por numero de comprobante.
     */
    public function buscarPorNumeroComprobante(
        string $numeroComprobante
    ): array {

        $numeroNormalizado =
            $this
                ->normalizarNumeroComprobante(
                    $numeroComprobante
                );

        $venta =
            $this
                ->consultaPorNumeroNormalizado(
                    $numeroNormalizado
                )
                ->with(
                    $this
                        ->relacionesCompletas()
                )
                ->first();

        if (!$venta) {

            throw ValidationException::withMessages([
                'numero_comprobante' => [
                    'No se encontro una venta con ese codigo de nota de venta.',
                ],
            ]);
        }

        $evaluacion =
            $this->evaluarAnulacion(
                $venta
            );

        return [
            'venta' =>
                $venta,

            'puede_anular' =>
                $evaluacion[
                    'puede_anular'
                ],

            'motivo_bloqueo' =>
                $evaluacion[
                    'motivo_bloqueo'
                ],
        ];
    }

    /**
     * Anular una venta del dia actual.
     *
     * Las ventas nuevas restauran exactamente
     * los lotes consumidos.
     *
     * Las ventas antiguas sin trazabilidad
     * generan un lote de restauracion.
     */
    public function anular(
        string $numeroComprobante
    ): array {

        $usuarioAutenticado =
            $this
                ->obtenerUsuarioAutenticado();

        $idUsuarioAnulacion =
            (int)
            $usuarioAutenticado
                ->id_usuario;

        $numeroNormalizado =
            $this
                ->normalizarNumeroComprobante(
                    $numeroComprobante
                );

        $venta =
            DB::transaction(
                function () use (
                    $numeroNormalizado,
                    $idUsuarioAnulacion
                ): Venta {

                    $venta =
                        $this
                            ->consultaPorNumeroNormalizado(
                                $numeroNormalizado
                            )
                            ->lockForUpdate()
                            ->first();

                    if (!$venta) {

                        throw ValidationException::withMessages([
                            'numero_comprobante' => [
                                'No se encontro una venta con ese codigo de nota de venta.',
                            ],
                        ]);
                    }

                    $evaluacion =
                        $this->evaluarAnulacion(
                            $venta
                        );

                    if (
                        !$evaluacion[
                            'puede_anular'
                        ]
                    ) {

                        throw ValidationException::withMessages([
                            'venta' => [
                                $evaluacion[
                                    'motivo_bloqueo'
                                ]
                                ?? 'La venta no puede anularse.',
                            ],
                        ]);
                    }

                    $detalles =
                        DetalleVenta::query()
                            ->with(
                                'consumosLote'
                            )
                            ->where(
                                'id_venta',
                                $venta
                                    ->id_venta
                            )
                            ->orderBy(
                                'id_producto'
                            )
                            ->get();

                    if (
                        $detalles
                            ->isEmpty()
                    ) {

                        throw ValidationException::withMessages([
                            'venta' => [
                                'La venta no contiene detalles y no puede restaurarse el stock.',
                            ],
                        ]);
                    }

                    foreach (
                        $detalles
                        as $detalle
                    ) {

                        $producto =
                            Producto::query()
                                ->where(
                                    'id_producto',
                                    $detalle
                                        ->id_producto
                                )
                                ->lockForUpdate()
                                ->first();

                        if (!$producto) {

                            throw ValidationException::withMessages([
                                'producto' => [
                                    'No se pudo restaurar el stock porque uno de los productos ya no existe.',
                                ],
                            ]);
                        }

                        /*
                         * Venta nueva con trazabilidad.
                         */
                        if (
                            $detalle
                                ->consumosLote
                                ->isNotEmpty()
                        ) {

                            foreach (
                                $detalle
                                    ->consumosLote
                                as $consumo
                            ) {

                                $lote =
                                    LoteProducto::query()
                                        ->where(
                                            'id_lote_producto',
                                            $consumo
                                                ->id_lote_producto
                                        )
                                        ->lockForUpdate()
                                        ->first();

                                if (!$lote) {

                                    throw ValidationException::withMessages([
                                        'lote' => [
                                            'No se pudo restaurar uno de los lotes utilizados por la venta.',
                                        ],
                                    ]);
                                }

                                $lote
                                    ->cantidad_disponible =
                                        (int)
                                        $lote
                                            ->cantidad_disponible
                                        + (int)
                                        $consumo
                                            ->cantidad;

                                $lote->save();
                            }

                        } else {

                            /*
                             * Compatibilidad con ventas
                             * registradas antes de existir
                             * detalle_venta_lote.
                             *
                             * Se crea un lote de restauracion
                             * para mantener la consistencia.
                             */
                            LoteProducto::create([
                                'id_producto' =>
                                    $producto
                                        ->id_producto,

                                'cantidad_inicial' =>
                                    (int)
                                    $detalle
                                        ->cantidad_detalle_venta,

                                'cantidad_disponible' =>
                                    (int)
                                    $detalle
                                        ->cantidad_detalle_venta,

                                'costo_unitario' =>
                                    (float)
                                    $detalle
                                        ->costo_detalle_venta,

                                'fecha_ingreso' =>
                                    now(
                                        self::ZONA_HORARIA
                                    )
                                        ->toDateString(),

                                'fecha_caducidad' =>
                                    null,

                                'estado' =>
                                    true,
                            ]);
                        }

                        /*
                         * Mantener sincronizado el stock
                         * general temporal.
                         */
                        $producto
                            ->stock_producto =
                                (int)
                                $producto
                                    ->stock_producto
                                + (int)
                                $detalle
                                    ->cantidad_detalle_venta;

                        $producto->save();
                    }

                    $venta
                        ->estado_venta =
                            self::ESTADO_ANULADA;

                    $venta
                        ->fecha_anulacion =
                            now(
                                self::ZONA_HORARIA
                            );

                    $venta
                        ->id_usuario_anulacion =
                            $idUsuarioAnulacion;

                    $venta->save();

                    $venta->load(
                        $this
                            ->relacionesCompletas()
                    );

                    return $venta;
                }
            );

        return [
            'mensaje' =>
                'Venta anulada correctamente. El stock fue restaurado.',

            'venta' =>
                $venta,
        ];
    }

    /**
     * Consultar cliente segun tipo.
     */
    private function consultarClienteSegunTipo(
        string $tipoCliente,
        string $numeroDocumento
    ): ?array {

        if (
            $tipoCliente
            === 'VENTA RAPIDA'
        ) {
            return null;
        }

        if (
            $tipoCliente
            === 'BOLETA'
        ) {

            if (
                !preg_match(
                    '/^\d{8}$/',
                    $numeroDocumento
                )
            ) {

                throw ValidationException::withMessages([
                    'numero_documento' => [
                        'El DNI debe contener exactamente 8 digitos.',
                    ],
                ]);
            }

            $datosCliente =
                $this
                    ->consultaDocumentoService
                    ->consultarDni(
                        $numeroDocumento
                    );

            $dniDevuelto =
                preg_replace(
                    '/\D+/',
                    '',
                    (string) (
                        $datosCliente[
                            'dni'
                        ]
                        ?? ''
                    )
                );

            $nombres =
                trim(
                    (string) (
                        $datosCliente[
                            'nombres'
                        ]
                        ?? ''
                    )
                );

            if (
                $dniDevuelto
                    !== $numeroDocumento
                || $nombres === ''
            ) {

                throw ValidationException::withMessages([
                    'numero_documento' => [
                        'No se encontro informacion valida para el DNI ingresado.',
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
                    'El RUC debe contener exactamente 11 digitos.',
                ],
            ]);
        }

        $datosCliente =
            $this
                ->consultaDocumentoService
                ->consultarRuc(
                    $numeroDocumento
                );

        $rucDevuelto =
            preg_replace(
                '/\D+/',
                '',
                (string) (
                    $datosCliente[
                        'ruc'
                    ]
                    ?? ''
                )
            );

        $razonSocial =
            trim(
                (string) (
                    $datosCliente[
                        'razonSocial'
                    ]
                    ?? ''
                )
            );

        if (
            $rucDevuelto
                !== $numeroDocumento
            || $razonSocial === ''
        ) {

            throw ValidationException::withMessages([
                'numero_documento' => [
                    'No se encontro informacion valida para el RUC ingresado.',
                ],
            ]);
        }

        $estadoRuc =
            strtoupper(
                trim(
                    (string) (
                        $datosCliente[
                            'estado'
                        ]
                        ?? ''
                    )
                )
            );

        $condicionRuc =
            strtoupper(
                trim(
                    (string) (
                        $datosCliente[
                            'condicion'
                        ]
                        ?? ''
                    )
                )
            );

        if (
            $estadoRuc
            !== 'ACTIVO'
        ) {

            throw ValidationException::withMessages([
                'numero_documento' => [
                    "El RUC consultado tiene estado {$estadoRuc}.",
                ],
            ]);
        }

        if (
            $condicionRuc
            !== 'HABIDO'
        ) {

            throw ValidationException::withMessages([
                'numero_documento' => [
                    "El RUC consultado tiene condicion {$condicionRuc}.",
                ],
            ]);
        }

        return $datosCliente;
    }

    /**
     * Validar y agrupar productos repetidos.
     */
    private function normalizarDetalles(
        mixed $detallesRecibidos
    ): array {

        if (
            !is_array(
                $detallesRecibidos
            )
            || count(
                $detallesRecibidos
            ) === 0
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
            as $indice =>
            $detalleRecibido
        ) {

            if (
                !is_array(
                    $detalleRecibido
                )
            ) {

                throw ValidationException::withMessages([
                    "detalles.{$indice}" => [
                        'El detalle del producto no tiene un formato valido.',
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
                !is_numeric(
                    $idProducto
                )
                || (int)
                    $idProducto
                    <= 0
                || (int)
                    $idProducto
                    != (float)
                    $idProducto
            ) {

                throw ValidationException::withMessages([
                    "detalles.{$indice}.id_producto" => [
                        'El producto seleccionado no es valido.',
                    ],
                ]);
            }

            if (
                !is_numeric(
                    $cantidadRecibida
                )
                || (float)
                    $cantidadRecibida
                    <= 0
                || (int)
                    $cantidadRecibida
                    != (float)
                    $cantidadRecibida
            ) {

                throw ValidationException::withMessages([
                    "detalles.{$indice}.cantidad" => [
                        'La cantidad debe ser un numero entero mayor que cero.',
                    ],
                ]);
            }

            $idProducto =
                (int)
                $idProducto;

            $cantidad =
                (int)
                $cantidadRecibida;

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
            ] +=
                $cantidad;
        }

        ksort(
            $cantidadesPorProducto
        );

        return $cantidadesPorProducto;
    }

    /**
     * Confirmar usuario autenticado.
     */
    private function obtenerUsuarioAutenticado():
        Usuario {

        $usuario =
            Auth::user();

        if (
            !$usuario
            instanceof Usuario
        ) {

            throw ValidationException::withMessages([
                'usuario' => [
                    'No existe un usuario autenticado para realizar la operacion.',
                ],
            ]);
        }

        if (
            !$usuario
                ->estado_usuario
        ) {

            throw ValidationException::withMessages([
                'usuario' => [
                    'El usuario autenticado se encuentra inactivo.',
                ],
            ]);
        }

        return $usuario;
    }

    /**
     * Buscar comprobante normalizado.
     */
    private function consultaPorNumeroNormalizado(
        string $numeroNormalizado
    ): Builder {

        return Venta::query()
            ->whereRaw(
                "
                REPLACE(
                    REPLACE(
                        UPPER(numero_comprobante),
                        '-',
                        ''
                    ),
                    ' ',
                    ''
                ) = ?
                ",
                [
                    $numeroNormalizado,
                ]
            );
    }

    /**
     * Evaluar anulacion.
     */
    private function evaluarAnulacion(
        Venta $venta
    ): array {

        $estadoVenta =
            strtoupper(
                trim(
                    (string)
                    $venta
                        ->estado_venta
                )
            );

        if (
            $estadoVenta
            === self::ESTADO_ANULADA
        ) {

            return [
                'puede_anular' =>
                    false,

                'motivo_bloqueo' =>
                    'La venta ya se encuentra anulada.',
            ];
        }

        if (
            $estadoVenta
            !== self::ESTADO_REGISTRADA
        ) {

            return [
                'puede_anular' =>
                    false,

                'motivo_bloqueo' =>
                    'La venta no tiene un estado valido para anularse.',
            ];
        }

        $fechaVenta =
            Carbon::parse(
                $venta
                    ->fecha_venta,
                self::ZONA_HORARIA
            )
                ->timezone(
                    self::ZONA_HORARIA
                );

        $hoy =
            now(
                self::ZONA_HORARIA
            );

        if (
            !$fechaVenta
                ->isSameDay(
                    $hoy
                )
        ) {

            return [
                'puede_anular' =>
                    false,

                'motivo_bloqueo' =>
                    'Solo pueden anularse ventas realizadas durante el dia actual.',
            ];
        }

        return [
            'puede_anular' =>
                true,

            'motivo_bloqueo' =>
                null,
        ];
    }

    /**
     * Normalizar codigo de comprobante.
     */
    private function normalizarNumeroComprobante(
        string $numeroComprobante
    ): string {

        $numeroNormalizado =
            strtoupper(
                preg_replace(
                    '/[^A-Z0-9]/',
                    '',
                    trim(
                        $numeroComprobante
                    )
                )
                ?? ''
            );

        if (
            $numeroNormalizado
            === ''
        ) {

            throw ValidationException::withMessages([
                'numero_comprobante' => [
                    'El codigo de la nota de venta es obligatorio.',
                ],
            ]);
        }

        if (
            strlen(
                $numeroNormalizado
            )
            > 20
        ) {

            throw ValidationException::withMessages([
                'numero_comprobante' => [
                    'El codigo de la nota de venta no es valido.',
                ],
            ]);
        }

        return $numeroNormalizado;
    }

    /**
     * Relaciones utilizadas al devolver
     * una venta completa.
     */
    private function relacionesCompletas():
        array {

        return [
            'usuario.personal',
            'usuarioAnulacion.personal',
            'cliente',
            'serieComprobante',
            'detalleVentas.producto',
            'detalleVentas.consumosLote.loteProducto',
        ];
    }
}