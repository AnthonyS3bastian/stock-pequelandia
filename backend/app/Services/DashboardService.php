<?php

namespace App\Services;

use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\Usuario;
use App\Models\Venta;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

class DashboardService
{
    private const META_DIARIA =
        100.00;

    private const ESTADO_ANULADA =
        'ANULADA';

    private const LIMITE_ELEMENTOS =
        5;

    public function obtenerDashboard(
        Usuario $usuario
    ): array {
        $zonaHoraria =
            'America/Lima';

        $ahora =
            CarbonImmutable::now(
                $zonaHoraria
            );

        $inicioDia =
            $ahora
                ->startOfDay();

        $finDia =
            $ahora
                ->endOfDay();

        $inicioSemana =
            $ahora
                ->startOfWeek(
                    CarbonInterface::MONDAY
                )
                ->startOfDay();

        $finSemana =
            $ahora
                ->endOfWeek(
                    CarbonInterface::SUNDAY
                )
                ->endOfDay();

        $ventasHoy =
            $this->consultarVentas(
                $inicioDia,
                $finDia
            );

        $ventasSemana =
            $this->consultarVentas(
                $inicioSemana,
                $finSemana
            );

        $ventasHoyValidas =
            $this->obtenerVentasValidas(
                $ventasHoy
            );

        $ventasSemanaValidas =
            $this->obtenerVentasValidas(
                $ventasSemana
            );

        $detallesHoy =
            $this->obtenerDetalles(
                $ventasHoyValidas
            );

        $totalVendidoHoy =
            round(
                (float) $ventasHoyValidas
                    ->sum(
                        'total_venta'
                    ),
                2
            );

        $ventasRealizadasHoy =
            $ventasHoyValidas
                ->count();

        $productosVendidosHoy =
            (int) $detallesHoy
                ->sum(
                    'cantidad_detalle_venta'
                );

        $productosStockBajo =
            Producto::query()
                ->where(
                    'estado',
                    true
                )
                ->where(
                    'stock_producto',
                    '>',
                    0
                )
                ->whereColumn(
                    'stock_producto',
                    '<=',
                    'stock_minimo_producto'
                )
                ->count();

        $productosAgotados =
            Producto::query()
                ->where(
                    'estado',
                    true
                )
                ->where(
                    'stock_producto',
                    '<=',
                    0
                )
                ->count();

        $porcentajeMeta =
            self::META_DIARIA > 0
                ? round(
                    (
                        $totalVendidoHoy
                        / self::META_DIARIA
                    ) * 100,
                    2
                )
                : 0.00;

        $rolUsuario =
            strtoupper(
                trim(
                    (string) $usuario
                        ->rol_usuario
                )
            );

        $esAdministrador =
            $rolUsuario
            === 'ADMINISTRADOR';

        return [
            'fecha' =>
                $ahora
                    ->toDateString(),

            'inicio_semana' =>
                $inicioSemana
                    ->toDateString(),

            'fin_semana' =>
                $finSemana
                    ->toDateString(),

            'rol_usuario' =>
                $rolUsuario,

            'es_administrador' =>
                $esAdministrador,

            'resumen' => [
                'total_vendido_hoy' =>
                    $totalVendidoHoy,

                'ventas_realizadas_hoy' =>
                    $ventasRealizadasHoy,

                'productos_vendidos_hoy' =>
                    $productosVendidosHoy,

                'productos_stock_bajo' =>
                    $productosStockBajo,

                'productos_agotados' =>
                    $productosAgotados,

                'alertas_stock' =>
                    $productosStockBajo
                    + $productosAgotados,
            ],

            'meta_diaria' => [
                'meta' =>
                    self::META_DIARIA,

                'vendido_hoy' =>
                    $totalVendidoHoy,

                'porcentaje' =>
                    $porcentajeMeta,

                'cumplida' =>
                    $totalVendidoHoy
                    >= self::META_DIARIA,
            ],

            'ventas_semana' =>
                $this->obtenerVentasSemana(
                    $ventasSemanaValidas,
                    $inicioSemana
                ),

            'stock_critico' =>
                $this->obtenerStockCritico(),

            'ultimas_ventas' =>
                $this->obtenerUltimasVentas(
                    $ventasHoy,
                    $usuario,
                    $esAdministrador
                ),
        ];
    }

    private function consultarVentas(
        CarbonImmutable $inicio,
        CarbonImmutable $fin
    ): Collection {
        return Venta::query()
            ->with([
                'usuario:id_usuario,nombre_usuario,id_personal',

                'usuario.personal:id_personal,nombre_personal,apellido_personal',

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

    private function obtenerVentasValidas(
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

    private function obtenerDetalles(
        Collection $ventas
    ): Collection {
        return $ventas->flatMap(
            fn (Venta $venta): Collection =>
                $venta->detalleVentas
        );
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

    private function obtenerVentasSemana(
        Collection $ventas,
        CarbonImmutable $inicioSemana
    ): array {
        $ventasAgrupadas =
            $ventas->groupBy(
                function (
                    Venta $venta
                ): string {
                    return $this
                        ->convertirFechaVenta(
                            $venta
                        )
                        ->toDateString();
                }
            );

        $resultado = [];

        for (
            $indice = 0;
            $indice < 7;
            $indice++
        ) {
            $fecha =
                $inicioSemana
                    ->addDays(
                        $indice
                    );

            $fechaTexto =
                $fecha
                    ->toDateString();

            $ventasDia =
                $ventasAgrupadas
                    ->get(
                        $fechaTexto,
                        collect()
                    );

            $resultado[] = [
                'fecha' =>
                    $fechaTexto,

                'dia' =>
                    $this->obtenerNombreDia(
                        $fecha
                            ->dayOfWeekIso
                    ),

                'total_vendido' =>
                    round(
                        (float) $ventasDia
                            ->sum(
                                'total_venta'
                            ),
                        2
                    ),

                'numero_ventas' =>
                    $ventasDia
                        ->count(),
            ];
        }

        return $resultado;
    }

    private function obtenerStockCritico():
        array {
        return Producto::query()
            ->where(
                'estado',
                true
            )
            ->whereColumn(
                'stock_producto',
                '<=',
                'stock_minimo_producto'
            )
            ->orderBy(
                'stock_producto'
            )
            ->orderBy(
                'nombre_producto'
            )
            ->limit(
                self::LIMITE_ELEMENTOS
            )
            ->get([
                'id_producto',
                'codigo_producto',
                'nombre_producto',
                'stock_producto',
                'stock_minimo_producto',
            ])
            ->map(
                function (
                    Producto $producto
                ): array {
                    $stock =
                        (int) $producto
                            ->stock_producto;

                    $stockMinimo =
                        (int) $producto
                            ->stock_minimo_producto;

                    $porcentaje =
                        $stockMinimo > 0
                            ? round(
                                (
                                    max(
                                        $stock,
                                        0
                                    )
                                    / $stockMinimo
                                ) * 100,
                                2
                            )
                            : 0.00;

                    return [
                        'id_producto' =>
                            (int) $producto
                                ->id_producto,

                        'codigo_producto' =>
                            $producto
                                ->codigo_producto,

                        'nombre_producto' =>
                            $producto
                                ->nombre_producto,

                        'stock_producto' =>
                            $stock,

                        'stock_minimo_producto' =>
                            $stockMinimo,

                        'porcentaje_stock' =>
                            min(
                                $porcentaje,
                                100
                            ),

                        'estado_stock' =>
                            $stock <= 0
                                ? 'AGOTADO'
                                : 'BAJO',
                    ];
                }
            )
            ->values()
            ->all();
    }

    private function obtenerUltimasVentas(
        Collection $ventasHoy,
        Usuario $usuario,
        bool $esAdministrador
    ): array {
        $ventasVisibles =
            $esAdministrador
                ? $ventasHoy
                : $ventasHoy
                    ->where(
                        'id_usuario',
                        $usuario
                            ->id_usuario
                    )
                    ->values();

        return $ventasVisibles
            ->take(
                self::LIMITE_ELEMENTOS
            )
            ->map(
                function (
                    Venta $venta
                ): array {
                    $anulada =
                        $this->esVentaAnulada(
                            $venta
                        );

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

                    $fechaVenta =
                        $this
                            ->convertirFechaVenta(
                                $venta
                            );

                    $cantidadProductos =
                        (int) $venta
                            ->detalleVentas
                            ->sum(
                                'cantidad_detalle_venta'
                            );

                    $productos =
                        $anulada
                            ? 'Venta anulada'
                            : $this
                                ->obtenerResumenProductos(
                                    $venta
                                );

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
                                ->format(
                                    'H:i'
                                ),

                        'productos' =>
                            $productos,

                        'cantidad_productos' =>
                            $cantidadProductos,

                        'usuario' =>
                            $this
                                ->obtenerNombreUsuario(
                                    $venta
                                ),

                        'total' =>
                            round(
                                (float) $venta
                                    ->total_venta,
                                2
                            ),

                        'estado' =>
                            $estado,

                        'anulada' =>
                            $anulada,
                    ];
                }
            )
            ->values()
            ->all();
    }

    private function obtenerResumenProductos(
        Venta $venta
    ): string {
        $detalles =
            $venta
                ->detalleVentas;

        if ($detalles->isEmpty()) {
            return 'Sin productos';
        }

        $productos =
            $detalles
                ->take(3)
                ->map(
                    function (
                        DetalleVenta $detalle
                    ): string {
                        $nombre =
                            $detalle
                                ->producto
                                ?->nombre_producto
                            ?? 'Producto no disponible';

                        $cantidad =
                            (int) $detalle
                                ->cantidad_detalle_venta;

                        return
                            "{$nombre} x{$cantidad}";
                    }
                )
                ->implode(', ');

        $cantidadRestante =
            $detalles->count()
            - 3;

        if ($cantidadRestante > 0) {
            $productos .=
                " y {$cantidadRestante} más";
        }

        return $productos;
    }

    private function obtenerNombreUsuario(
        Venta $venta
    ): string {
        $personal =
            $venta
                ->usuario
                ?->personal;

        $nombreCompleto =
            trim(
                implode(
                    ' ',
                    array_filter([
                        $personal
                            ?->nombre_personal,

                        $personal
                            ?->apellido_personal,
                    ])
                )
            );

        if ($nombreCompleto !== '') {
            return $nombreCompleto;
        }

        return $venta
            ->usuario
            ?->nombre_usuario
            ?? 'Usuario no disponible';
    }

    private function convertirFechaVenta(
        Venta $venta
    ): CarbonImmutable {
        return CarbonImmutable::parse(
            $venta->fecha_venta
        )->setTimezone(
            'America/Lima'
        );
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
}