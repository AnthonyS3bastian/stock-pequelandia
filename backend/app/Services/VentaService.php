<?php

namespace App\Services;

use App\Models\DetalleVenta;
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
         * Se mantienen estos nombres internos
         * para conservar compatibilidad:
         *
         * VENTA RAPIDA = Público general.
         * BOLETA       = Cliente con DNI.
         * FACTURA      = Cliente con RUC.
         *
         * Todos generan una NOTA DE VENTA.
         */
        $tipoCliente = strtoupper(
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
                    'El tipo de cliente no es válido.',
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
            $numeroDocumento ?? '';

        /*
         * La consulta externa se realiza antes
         * de abrir la transacción.
         */
        $datosClienteConsultado =
            $this->consultarClienteSegunTipo(
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

        $venta = DB::transaction(
            function () use (
                $idUsuario,
                $tipoCliente,
                $datosClienteConsultado,
                $cantidadesPorProducto
            ): Venta {
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

                $cliente = match (
                    $tipoCliente
                ) {
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
                 * Todas las ventas usan una sola serie
                 * interna de nota de venta.
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
                                (string) $serieComprobante
                                    ->serie_documento
                            )
                        )
                        ?? ''
                    );

                $numeroCorrelativo =
                    (int) $serieComprobante
                        ->numero_correlativo;

                if (
                    $serieDocumento === ''
                    || $numeroCorrelativo <= 0
                ) {
                    throw ValidationException::withMessages([
                        'serie_comprobante' => [
                            'La serie o el correlativo de la nota de venta no están configurados correctamente.',
                        ],
                    ]);
                }

                $productosVenta = [];

                $totalVenta = 0.0;

                foreach (
                    $cantidadesPorProducto
                    as $idProducto => $cantidad
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

                    if (!$producto->estado) {
                        throw ValidationException::withMessages([
                            'productos' => [
                                "El producto {$producto->nombre_producto} se encuentra inactivo.",
                            ],
                        ]);
                    }

                    if (
                        $producto
                            ->fecha_caducidad
                        && Carbon::parse(
                            $producto
                                ->fecha_caducidad,
                            self::ZONA_HORARIA
                        )
                            ->startOfDay()
                            ->lt(
                                now(
                                    self::ZONA_HORARIA
                                )->startOfDay()
                            )
                    ) {
                        throw ValidationException::withMessages([
                            'productos' => [
                                "El producto {$producto->nombre_producto} se encuentra vencido y no puede venderse.",
                            ],
                        ]);
                    }

                    $stockDisponible =
                        (int) $producto
                            ->stock_producto;

                    if (
                        $stockDisponible
                        < $cantidad
                    ) {
                        throw ValidationException::withMessages([
                            'stock' => [
                                "Stock insuficiente para {$producto->nombre_producto}. "
                                . "Disponible: {$stockDisponible}. "
                                . "Solicitado: {$cantidad}.",
                            ],
                        ]);
                    }

                    $precioUnitario =
                        round(
                            (float) $producto
                                ->precio_producto,
                            2
                        );

                    $costoUnitario =
                        round(
                            (float) $producto
                                ->costo_producto,
                            2
                        );

                    if (
                        $precioUnitario <= 0
                    ) {
                        throw ValidationException::withMessages([
                            'precio' => [
                                "El producto {$producto->nombre_producto} no tiene un precio de venta válido.",
                            ],
                        ]);
                    }

                    if (
                        $costoUnitario < 0
                    ) {
                        throw ValidationException::withMessages([
                            'costo' => [
                                "El producto {$producto->nombre_producto} no tiene un costo válido.",
                            ],
                        ]);
                    }

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
                 * Formato final sin guion:
                 *
                 * NV00100000001
                 */
                $numeroComprobante =
                    $serieDocumento
                    . str_pad(
                        (string) $numeroCorrelativo,
                        8,
                        '0',
                        STR_PAD_LEFT
                    );

                if (
                    strlen(
                        $numeroComprobante
                    ) > 20
                ) {
                    throw ValidationException::withMessages([
                        'numero_comprobante' => [
                            'El código de la nota de venta supera los 20 caracteres permitidos.',
                        ],
                    ]);
                }

                $venta = Venta::create([
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
                        (int) $productoVenta[
                            'cantidad'
                        ];

                    DetalleVenta::create([
                        'precio_publico_venta' =>
                            (float) $productoVenta[
                                'precio_unitario'
                            ],

                        'costo_detalle_venta' =>
                            (float) $productoVenta[
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

                    $producto
                        ->stock_producto =
                            (int) $producto
                                ->stock_producto
                            - $cantidad;

                    $producto->save();
                }

                $serieComprobante
                    ->numero_correlativo =
                        $numeroCorrelativo
                        + 1;

                $serieComprobante->save();

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
     * Buscar una venta por el código
     * de la nota de venta.
     *
     * También reconoce ventas antiguas
     * guardadas con guion.
     */
    public function buscarPorNumeroComprobante(
        string $numeroComprobante
    ): array {
        $numeroNormalizado =
            $this->normalizarNumeroComprobante(
                $numeroComprobante
            );

        $venta =
            $this->consultaPorNumeroNormalizado(
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
                    'No se encontró una venta con ese código de nota de venta.',
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
     * Anular una venta del día actual
     * y devolver el stock.
     */
    public function anular(
        string $numeroComprobante
    ): array {
        $usuarioAutenticado =
            $this->obtenerUsuarioAutenticado();

        $idUsuarioAnulacion =
            (int) $usuarioAutenticado
                ->id_usuario;

        $numeroNormalizado =
            $this->normalizarNumeroComprobante(
                $numeroComprobante
            );

        $venta = DB::transaction(
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
                            'No se encontró una venta con ese código de nota de venta.',
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
                        ->where(
                            'id_venta',
                            $venta->id_venta
                        )
                        ->orderBy(
                            'id_producto'
                        )
                        ->get();

                if (
                    $detalles->isEmpty()
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

                    $producto
                        ->stock_producto =
                            (int) $producto
                                ->stock_producto
                            + (int) $detalle
                                ->cantidad_detalle_venta;

                    $producto->save();
                }

                $venta->estado_venta =
                    self::ESTADO_ANULADA;

                $venta->fecha_anulacion =
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
     * Consultar y validar al cliente
     * según el dato seleccionado.
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
                        'El DNI debe contener exactamente 8 dígitos.',
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
                    'No se encontró información válida para el RUC ingresado.',
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
            $estadoRuc !== 'ACTIVO'
        ) {
            throw ValidationException::withMessages([
                'numero_documento' => [
                    "El RUC consultado tiene estado {$estadoRuc}.",
                ],
            ]);
        }

        if (
            $condicionRuc !== 'HABIDO'
        ) {
            throw ValidationException::withMessages([
                'numero_documento' => [
                    "El RUC consultado tiene condición {$condicionRuc}.",
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
            as $indice => $detalleRecibido
        ) {
            if (
                !is_array(
                    $detalleRecibido
                )
            ) {
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
                !is_numeric(
                    $idProducto
                )
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
                !is_numeric(
                    $cantidadRecibida
                )
                || (float) $cantidadRecibida
                    <= 0
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

        ksort(
            $cantidadesPorProducto
        );

        return $cantidadesPorProducto;
    }

    /**
     * Confirmar usuario autenticado y activo.
     */
    private function obtenerUsuarioAutenticado():
        Usuario {
        $usuario = Auth::user();

        if (
            !$usuario instanceof Usuario
        ) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'No existe un usuario autenticado para realizar la operación.',
                ],
            ]);
        }

        if (
            !$usuario->estado_usuario
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
     * Buscar ignorando guiones, espacios
     * y otros caracteres.
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
     * Evaluar si una venta puede anularse.
     */
    private function evaluarAnulacion(
        Venta $venta
    ): array {
        $estadoVenta =
            strtoupper(
                trim(
                    (string) $venta
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
                    'La venta no tiene un estado válido para anularse.',
            ];
        }

        $fechaVenta =
            Carbon::parse(
                $venta->fecha_venta,
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
            !$fechaVenta->isSameDay(
                $hoy
            )
        ) {
            return [
                'puede_anular' =>
                    false,

                'motivo_bloqueo' =>
                    'Solo pueden anularse ventas realizadas durante el día actual.',
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
     * Normalizar el código escaneado.
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
            $numeroNormalizado === ''
        ) {
            throw ValidationException::withMessages([
                'numero_comprobante' => [
                    'El código de la nota de venta es obligatorio.',
                ],
            ]);
        }

        if (
            strlen(
                $numeroNormalizado
            ) > 20
        ) {
            throw ValidationException::withMessages([
                'numero_comprobante' => [
                    'El código de la nota de venta no es válido.',
                ],
            ]);
        }

        return $numeroNormalizado;
    }

    /**
     * Relaciones necesarias para imprimir,
     * buscar y anular.
     */
    private function relacionesCompletas():
        array {
        return [
            'usuario.personal',
            'usuarioAnulacion.personal',
            'cliente',
            'serieComprobante',
            'detalleVentas.producto',
        ];
    }
}