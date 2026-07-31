<?php

namespace App\Services;

use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\Venta;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class ReporteService
{
    private const META_DIARIA = 100.00;

    private const ESTADO_ANULADA =
        'ANULADA';

    /**
     * Obtener el valor comercial actual
     * de todos los productos con existencias.
     */
    public function obtenerResumenInventario(): array
    {
        $productos =
            Producto::query()
                ->select([
                    'id_producto',
                    'precio_producto',
                    'stock_producto',
                    'estado',
                ])
                ->get();

        $productosConStock =
            $productos
                ->filter(
                    fn (Producto $producto): bool =>
                        (int) $producto
                            ->stock_producto > 0
                )
                ->values();

        $valorComercial =
            round(
                (float) $productosConStock
                    ->sum(
                        function (
                            Producto $producto
                        ): float {
                            return
                                (int) $producto
                                    ->stock_producto
                                * (float) $producto
                                    ->precio_producto;
                        }
                    ),
                2
            );

        $totalUnidades =
            (int) $productosConStock
                ->sum(
                    'stock_producto'
                );

        return [
            'fecha_calculo' =>
                CarbonImmutable::now(
                    'America/Lima'
                )->toDateTimeString(),

            'valor_comercial_inventario' =>
                $valorComercial,

            'total_unidades' =>
                $totalUnidades,

            'productos_con_stock' =>
                $productosConStock
                    ->count(),

            'total_productos' =>
                $productos
                    ->count(),
        ];
    }

    /**
     * Obtener el reporte completo de un día.
     */
    public function obtenerReporteDiario(
        ?string $fecha
    ): array {
        $fechaReporte =
            $this->resolverFecha(
                $fecha
            );

        $inicioDia =
            $fechaReporte
                ->startOfDay();

        $finDia =
            $fechaReporte
                ->endOfDay();

        $todasLasVentas =
            $this->consultarVentas(
                $inicioDia,
                $finDia
            );

        $ventasContabilizables =
            $this->obtenerVentasContabilizables(
                $todasLasVentas
            );

        $detalles =
            $this->obtenerDetalles(
                $ventasContabilizables
            );

        $resumen =
            $this->calcularResumen(
                $ventasContabilizables,
                $detalles
            );

        $porcentajeMeta =
            self::META_DIARIA > 0
                ? round(
                    (
                        $resumen[
                            'total_vendido'
                        ]
                        / self::META_DIARIA
                    ) * 100,
                    2
                )
                : 0.00;

        return [
            'fecha' =>
                $fechaReporte
                    ->toDateString(),

            'total_vendido' =>
                $resumen[
                    'total_vendido'
                ],

            'costo_estimado' =>
                $resumen[
                    'costo_estimado'
                ],

            'ganancia_estimada' =>
                $resumen[
                    'ganancia_estimada'
                ],

            'numero_ventas' =>
                $resumen[
                    'numero_ventas'
                ],

            'productos_vendidos' =>
                $resumen[
                    'productos_vendidos'
                ],

            'ticket_promedio' =>
                $resumen[
                    'ticket_promedio'
                ],

            'meta_diaria' =>
                self::META_DIARIA,

            'porcentaje_meta' =>
                $porcentajeMeta,

            'meta_cumplida' =>
                $resumen[
                    'total_vendido'
                ] >= self::META_DIARIA,

            'producto_mas_vendido' =>
                $this
                    ->obtenerProductoMasVendido(
                        $detalles
                    ),

            'ventas_por_usuario' =>
                $this
                    ->obtenerVentasPorUsuario(
                        $ventasContabilizables
                    ),

            'ventas_por_hora' =>
                $this
                    ->obtenerVentasPorHora(
                        $ventasContabilizables
                    ),

            'ultimas_ventas' =>
                $this
                    ->obtenerUltimasVentas(
                        $todasLasVentas
                    ),
        ];
    }

    /**
     * Obtener el reporte completo de una semana.
     */
    public function obtenerReporteSemanal(
        ?string $fecha
    ): array {
        $fechaReporte =
            $this->resolverFecha(
                $fecha
            );

        $inicioSemana =
            $fechaReporte
                ->startOfWeek(
                    CarbonInterface::MONDAY
                )
                ->startOfDay();

        $finSemana =
            $fechaReporte
                ->endOfWeek(
                    CarbonInterface::SUNDAY
                )
                ->endOfDay();

        $todasLasVentas =
            $this->consultarVentas(
                $inicioSemana,
                $finSemana
            );

        $ventasContabilizables =
            $this->obtenerVentasContabilizables(
                $todasLasVentas
            );

        $detalles =
            $this->obtenerDetalles(
                $ventasContabilizables
            );

        $resumen =
            $this->calcularResumen(
                $ventasContabilizables,
                $detalles
            );

        $metaSemanal =
            round(
                self::META_DIARIA * 7,
                2
            );

        $porcentajeMeta =
            $metaSemanal > 0
                ? round(
                    (
                        $resumen[
                            'total_vendido'
                        ]
                        / $metaSemanal
                    ) * 100,
                    2
                )
                : 0.00;

        $ventasPorDia =
            $this->obtenerVentasPorDia(
                $ventasContabilizables,
                $inicioSemana,
                7
            );

        $diasMetaCumplida =
            collect(
                $ventasPorDia
            )
                ->where(
                    'meta_cumplida',
                    true
                )
                ->count();

        return [
            'fecha_referencia' =>
                $fechaReporte
                    ->toDateString(),

            'inicio_semana' =>
                $inicioSemana
                    ->toDateString(),

            'fin_semana' =>
                $finSemana
                    ->toDateString(),

            'total_vendido' =>
                $resumen[
                    'total_vendido'
                ],

            'costo_estimado' =>
                $resumen[
                    'costo_estimado'
                ],

            'ganancia_estimada' =>
                $resumen[
                    'ganancia_estimada'
                ],

            'numero_ventas' =>
                $resumen[
                    'numero_ventas'
                ],

            'productos_vendidos' =>
                $resumen[
                    'productos_vendidos'
                ],

            'ticket_promedio' =>
                $resumen[
                    'ticket_promedio'
                ],

            'meta_diaria' =>
                self::META_DIARIA,

            'meta_semanal' =>
                $metaSemanal,

            'porcentaje_meta' =>
                $porcentajeMeta,

            'meta_cumplida' =>
                $resumen[
                    'total_vendido'
                ] >= $metaSemanal,

            'dias_meta_cumplida' =>
                $diasMetaCumplida,

            'mejor_dia' =>
                $this->obtenerMejorDia(
                    $ventasPorDia
                ),

            'producto_mas_vendido' =>
                $this
                    ->obtenerProductoMasVendido(
                        $detalles
                    ),

            'ventas_por_usuario' =>
                $this
                    ->obtenerVentasPorUsuario(
                        $ventasContabilizables
                    ),

            'ventas_por_dia' =>
                $ventasPorDia,

            'ultimas_ventas' =>
                $this
                    ->obtenerUltimasVentas(
                        $todasLasVentas
                    ),
        ];
    }

    /**
     * Obtener el reporte completo de un mes.
     */
    public function obtenerReporteMensual(
        ?string $fecha
    ): array {
        $fechaReporte =
            $this->resolverFecha(
                $fecha
            );

        $inicioMes =
            $fechaReporte
                ->startOfMonth()
                ->startOfDay();

        $finMes =
            $fechaReporte
                ->endOfMonth()
                ->endOfDay();

        $cantidadDiasMes =
            $fechaReporte
                ->daysInMonth;

        $todasLasVentas =
            $this->consultarVentas(
                $inicioMes,
                $finMes
            );

        $ventasContabilizables =
            $this->obtenerVentasContabilizables(
                $todasLasVentas
            );

        $detalles =
            $this->obtenerDetalles(
                $ventasContabilizables
            );

        $resumen =
            $this->calcularResumen(
                $ventasContabilizables,
                $detalles
            );

        $metaMensual =
            round(
                self::META_DIARIA
                * $cantidadDiasMes,
                2
            );

        $porcentajeMeta =
            $metaMensual > 0
                ? round(
                    (
                        $resumen[
                            'total_vendido'
                        ]
                        / $metaMensual
                    ) * 100,
                    2
                )
                : 0.00;

        $ventasPorDia =
            $this->obtenerVentasPorDia(
                $ventasContabilizables,
                $inicioMes,
                $cantidadDiasMes
            );

        $diasMetaCumplida =
            collect(
                $ventasPorDia
            )
                ->where(
                    'meta_cumplida',
                    true
                )
                ->count();

        return [
            'fecha_referencia' =>
                $fechaReporte
                    ->toDateString(),

            'inicio_mes' =>
                $inicioMes
                    ->toDateString(),

            'fin_mes' =>
                $finMes
                    ->toDateString(),

            'mes' =>
                $fechaReporte->month,

            'anio' =>
                $fechaReporte->year,

            'nombre_mes' =>
                $this->obtenerNombreMes(
                    $fechaReporte->month
                ),

            'cantidad_dias_mes' =>
                $cantidadDiasMes,

            'total_vendido' =>
                $resumen[
                    'total_vendido'
                ],

            'costo_estimado' =>
                $resumen[
                    'costo_estimado'
                ],

            'ganancia_estimada' =>
                $resumen[
                    'ganancia_estimada'
                ],

            'numero_ventas' =>
                $resumen[
                    'numero_ventas'
                ],

            'productos_vendidos' =>
                $resumen[
                    'productos_vendidos'
                ],

            'ticket_promedio' =>
                $resumen[
                    'ticket_promedio'
                ],

            'meta_diaria' =>
                self::META_DIARIA,

            'meta_mensual' =>
                $metaMensual,

            'porcentaje_meta' =>
                $porcentajeMeta,

            'meta_cumplida' =>
                $resumen[
                    'total_vendido'
                ] >= $metaMensual,

            'dias_meta_cumplida' =>
                $diasMetaCumplida,

            'mejor_dia' =>
                $this->obtenerMejorDia(
                    $ventasPorDia
                ),

            'producto_mas_vendido' =>
                $this
                    ->obtenerProductoMasVendido(
                        $detalles
                    ),

            'ventas_por_usuario' =>
                $this
                    ->obtenerVentasPorUsuario(
                        $ventasContabilizables
                    ),

            'ventas_por_dia' =>
                $ventasPorDia,

            'ultimas_ventas' =>
                $this
                    ->obtenerUltimasVentas(
                        $todasLasVentas
                    ),
        ];
    }

    private function consultarVentas(
        CarbonImmutable $inicio,
        CarbonImmutable $fin
    ): Collection {
        return Venta::query()
            ->with([
                'usuario:id_usuario,nombre_usuario',
                'usuarioAnulacion:id_usuario,nombre_usuario',
                'detalleVentas.producto:id_producto,nombre_producto',
            ])
            ->whereBetween(
                'fecha_venta',
                [
                    $inicio
                        ->toDateTimeString(),

                    $fin
                        ->toDateTimeString(),
                ]
            )
            ->orderByDesc(
                'fecha_venta'
            )
            ->orderByDesc(
                'id_venta'
            )
            ->get();
    }

    private function obtenerVentasContabilizables(
        Collection $ventas
    ): Collection {
        return $ventas
            ->reject(
                fn (Venta $venta): bool =>
                    $this->esVentaAnulada(
                        $venta
                    )
            )
            ->values();
    }

    private function esVentaAnulada(
        Venta $venta
    ): bool {
        return strtoupper(
            trim(
                (string) $venta
                    ->estado_venta
            )
        ) === self::ESTADO_ANULADA;
    }

    private function obtenerDetalles(
        Collection $ventas
    ): Collection {
        return $ventas->flatMap(
            fn (Venta $venta): Collection =>
                $venta->detalleVentas
        );
    }

    private function calcularResumen(
        Collection $ventas,
        Collection $detalles
    ): array {
        $totalVendido =
            round(
                (float) $ventas->sum(
                    'total_venta'
                ),
                2
            );

        $costoEstimado =
            round(
                (float) $detalles->sum(
                    function (
                        DetalleVenta $detalleVenta
                    ): float {
                        return
                            (float) $detalleVenta
                                ->costo_detalle_venta
                            * (int) $detalleVenta
                                ->cantidad_detalle_venta;
                    }
                ),
                2
            );

        $gananciaEstimada =
            round(
                $totalVendido
                - $costoEstimado,
                2
            );

        $numeroVentas =
            $ventas->count();

        $productosVendidos =
            (int) $detalles->sum(
                'cantidad_detalle_venta'
            );

        $ticketPromedio =
            $numeroVentas > 0
                ? round(
                    $totalVendido
                    / $numeroVentas,
                    2
                )
                : 0.00;

        return [
            'total_vendido' =>
                $totalVendido,

            'costo_estimado' =>
                $costoEstimado,

            'ganancia_estimada' =>
                $gananciaEstimada,

            'numero_ventas' =>
                $numeroVentas,

            'productos_vendidos' =>
                $productosVendidos,

            'ticket_promedio' =>
                $ticketPromedio,
        ];
    }

    private function obtenerVentasPorHora(
        Collection $ventas
    ): array {
        $ventasAgrupadas =
            $ventas->groupBy(
                function (
                    Venta $venta
                ): string {
                    return CarbonImmutable::parse(
                        $venta->fecha_venta,
                        'America/Lima'
                    )->format('H');
                }
            );

        $resultado = [];

        for (
            $hora = 0;
            $hora <= 23;
            $hora++
        ) {
            $claveHora =
                str_pad(
                    (string) $hora,
                    2,
                    '0',
                    STR_PAD_LEFT
                );

            $ventasHora =
                $ventasAgrupadas->get(
                    $claveHora,
                    collect()
                );

            $resultado[] = [
                'hora' =>
                    "{$claveHora}:00",

                'total_vendido' =>
                    round(
                        (float) $ventasHora
                            ->sum('total_venta'),
                        2
                    ),

                'numero_ventas' =>
                    $ventasHora->count(),
            ];
        }

        return $resultado;
    }

    private function resolverFecha(
        ?string $fecha
    ): CarbonImmutable {
        $zonaHoraria =
            'America/Lima';

        if (
            $fecha === null
            || trim($fecha) === ''
        ) {
            return CarbonImmutable::now(
                $zonaHoraria
            );
        }

        try {
            $fechaReporte =
                CarbonImmutable::createFromFormat(
                    'Y-m-d',
                    trim($fecha),
                    $zonaHoraria
                );
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'fecha' => [
                    'La fecha debe tener el formato AAAA-MM-DD.',
                ],
            ]);
        }

        if (
            !$fechaReporte
            || $fechaReporte
                ->format('Y-m-d')
                !== trim($fecha)
        ) {
            throw ValidationException::withMessages([
                'fecha' => [
                    'La fecha ingresada no es válida.',
                ],
            ]);
        }

        $hoy =
            CarbonImmutable::now(
                $zonaHoraria
            )->startOfDay();

        if (
            $fechaReporte
                ->startOfDay()
                ->isAfter($hoy)
        ) {
            throw ValidationException::withMessages([
                'fecha' => [
                    'No se pueden consultar fechas futuras.',
                ],
            ]);
        }

        return $fechaReporte;
    }

    private function obtenerVentasPorDia(
        Collection $ventas,
        CarbonImmutable $inicioPeriodo,
        int $cantidadDias
    ): array {
        $ventasAgrupadas =
            $ventas->groupBy(
                function (
                    Venta $venta
                ): string {
                    return CarbonImmutable::parse(
                        $venta->fecha_venta,
                        'America/Lima'
                    )->toDateString();
                }
            );

        $resultado = [];

        for (
            $indice = 0;
            $indice < $cantidadDias;
            $indice++
        ) {
            $fechaDia =
                $inicioPeriodo
                    ->addDays(
                        $indice
                    );

            $fechaTexto =
                $fechaDia
                    ->toDateString();

            $ventasDia =
                $ventasAgrupadas->get(
                    $fechaTexto,
                    collect()
                );

            $detallesDia =
                $this->obtenerDetalles(
                    $ventasDia
                );

            $resumenDia =
                $this->calcularResumen(
                    $ventasDia,
                    $detallesDia
                );

            $resultado[] = [
                'fecha' =>
                    $fechaTexto,

                'dia' =>
                    $this->obtenerNombreDia(
                        $fechaDia
                            ->dayOfWeekIso
                    ),

                'numero_dia' =>
                    $fechaDia->day,

                'total_vendido' =>
                    $resumenDia[
                        'total_vendido'
                    ],

                'numero_ventas' =>
                    $resumenDia[
                        'numero_ventas'
                    ],

                'productos_vendidos' =>
                    $resumenDia[
                        'productos_vendidos'
                    ],

                'meta_diaria' =>
                    self::META_DIARIA,

                'meta_cumplida' =>
                    $resumenDia[
                        'total_vendido'
                    ] >= self::META_DIARIA,
            ];
        }

        return $resultado;
    }

    private function obtenerMejorDia(
        array $ventasPorDia
    ): ?array {
        $diasConVentas =
            collect(
                $ventasPorDia
            )->filter(
                fn (array $dia): bool =>
                    $dia[
                        'numero_ventas'
                    ] > 0
            );

        if (
            $diasConVentas->isEmpty()
        ) {
            return null;
        }

        return $diasConVentas
            ->sortByDesc(
                'total_vendido'
            )
            ->values()
            ->first();
    }

    private function obtenerProductoMasVendido(
        Collection $detalles
    ): ?array {
        if (
            $detalles->isEmpty()
        ) {
            return null;
        }

        return $detalles
            ->groupBy(
                'id_producto'
            )
            ->map(
                function (
                    Collection $detallesProducto
                ): array {
                    /** @var DetalleVenta $primerDetalle */
                    $primerDetalle =
                        $detallesProducto
                            ->first();

                    return [
                        'id_producto' =>
                            (int) $primerDetalle
                                ->id_producto,

                        'nombre_producto' =>
                            $primerDetalle
                                ->producto
                                ?->nombre_producto
                            ?? 'Producto no disponible',

                        'cantidad' =>
                            (int) $detallesProducto
                                ->sum(
                                    'cantidad_detalle_venta'
                                ),
                    ];
                }
            )
            ->sortByDesc(
                'cantidad'
            )
            ->values()
            ->first();
    }

    private function obtenerVentasPorUsuario(
        Collection $ventas
    ): array {
        return $ventas
            ->groupBy(
                'id_usuario'
            )
            ->map(
                function (
                    Collection $ventasUsuario
                ): array {
                    /** @var Venta $primeraVenta */
                    $primeraVenta =
                        $ventasUsuario
                            ->first();

                    return [
                        'id_usuario' =>
                            (int) $primeraVenta
                                ->id_usuario,

                        'usuario' =>
                            $primeraVenta
                                ->usuario
                                ?->nombre_usuario
                            ?? 'Usuario no disponible',

                        'cantidad_ventas' =>
                            $ventasUsuario
                                ->count(),

                        'total_vendido' =>
                            round(
                                (float) $ventasUsuario
                                    ->sum(
                                        'total_venta'
                                    ),
                                2
                            ),
                    ];
                }
            )
            ->sortByDesc(
                'total_vendido'
            )
            ->values()
            ->all();
    }

    private function obtenerUltimasVentas(
        Collection $ventas
    ): array {
        return $ventas
            ->take(10)
            ->map(
                function (
                    Venta $venta
                ): array {
                    $ventaAnulada =
                        $this->esVentaAnulada(
                            $venta
                        );

                    $productos =
                        $ventaAnulada
                            ? 'Venta anulada'
                            : $venta
                                ->detalleVentas
                                ->map(
                                    function (
                                        DetalleVenta $detalleVenta
                                    ): string {
                                        $nombreProducto =
                                            $detalleVenta
                                                ->producto
                                                ?->nombre_producto
                                            ?? 'Producto no disponible';

                                        $cantidad =
                                            (int) $detalleVenta
                                                ->cantidad_detalle_venta;

                                        return
                                            "{$nombreProducto} x{$cantidad}";
                                    }
                                )
                                ->implode(', ');

                    if (
                        !$ventaAnulada
                        && trim($productos) === ''
                    ) {
                        $productos =
                            'Sin productos disponibles';
                    }

                    $fechaVenta =
                        CarbonImmutable::parse(
                            $venta->fecha_venta,
                            'America/Lima'
                        );

                    $fechaAnulacion =
                        $venta->fecha_anulacion
                            ? CarbonImmutable::parse(
                                $venta->fecha_anulacion,
                                'America/Lima'
                            )
                            : null;

                    $estado =
                        strtoupper(
                            trim(
                                (string) $venta
                                    ->estado_venta
                            )
                        );

                    if ($estado === '') {
                        $estado =
                            'REGISTRADA';
                    }

                    return [
                        'id_venta' =>
                            (int) $venta
                                ->id_venta,

                        'numero_venta' =>
                            "Venta N.° {$venta->id_venta}",

                        'numero_comprobante' =>
                            $venta
                                ->numero_comprobante,

                        'fecha' =>
                            $fechaVenta
                                ->toDateString(),

                        'hora' =>
                            $fechaVenta
                                ->format('H:i'),

                        'productos' =>
                            $productos,

                        'usuario' =>
                            $venta
                                ->usuario
                                ?->nombre_usuario
                            ?? 'Usuario no disponible',

                        'total' =>
                            round(
                                (float) $venta
                                    ->total_venta,
                                2
                            ),

                        'estado' =>
                            $estado,

                        'descripcion' =>
                            $ventaAnulada
                                ? 'Esta venta fue anulada y no se incluye en los indicadores del reporte.'
                                : 'Venta registrada correctamente.',

                        'fecha_anulacion' =>
                            $fechaAnulacion
                                ?->toDateString(),

                        'hora_anulacion' =>
                            $fechaAnulacion
                                ?->format('H:i'),

                        'usuario_anulacion' =>
                            $ventaAnulada
                                ? (
                                    $venta
                                        ->usuarioAnulacion
                                        ?->nombre_usuario
                                    ?? 'Usuario no disponible'
                                )
                                : null,
                    ];
                }
            )
            ->values()
            ->all();
    }

    private function obtenerNombreDia(
        int $numeroDia
    ): string {
        return match ($numeroDia) {
            1 => 'lunes',
            2 => 'martes',
            3 => 'miércoles',
            4 => 'jueves',
            5 => 'viernes',
            6 => 'sábado',
            7 => 'domingo',
            default => '',
        };
    }

    private function obtenerNombreMes(
        int $numeroMes
    ): string {
        return match ($numeroMes) {
            1 => 'enero',
            2 => 'febrero',
            3 => 'marzo',
            4 => 'abril',
            5 => 'mayo',
            6 => 'junio',
            7 => 'julio',
            8 => 'agosto',
            9 => 'septiembre',
            10 => 'octubre',
            11 => 'noviembre',
            12 => 'diciembre',
            default => '',
        };
    }
}