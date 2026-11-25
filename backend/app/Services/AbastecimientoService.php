<?php

namespace App\Services;

use App\Models\CodigoBarra;
use App\Models\LoteProducto;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AbastecimientoService
{
    /**
     * Listar los ingresos de mercaderia.
     */
    public function listar(): Collection
    {
        return LoteProducto::query()
            ->with([
                'producto.categoria',
                'producto.codigosBarra',
            ])
            ->orderBy(
                'fecha_ingreso',
                'desc'
            )
            ->orderBy(
                'id_lote_producto',
                'desc'
            )
            ->get();
    }

    /**
     * Registrar un nuevo abastecimiento.
     */
    public function registrar(
        array $datos
    ): LoteProducto {

        return DB::transaction(
            function () use (
                $datos
            ): LoteProducto {

                $producto =
                    Producto::query()
                        ->where(
                            'id_producto',
                            $datos[
                                'id_producto'
                            ]
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                if (
                    !$producto->estado
                ) {

                    throw ValidationException::withMessages([
                        'id_producto' => [
                            'El producto se encuentra inactivo. Debe activarlo antes de registrar un abastecimiento.',
                        ],
                    ]);
                }

                $cantidad =
                    (int)
                    $datos[
                        'cantidad'
                    ];

                $costoUnitario =
                    round(
                        (float)
                        $datos[
                            'costo_unitario'
                        ],
                        2
                    );

                $fechaCaducidad =
                    $datos[
                        'fecha_caducidad'
                    ]
                    ?? null;

                /*
                 * Registrar codigo de barras nuevo,
                 * si fue enviado.
                 */
                $codigoBarra =
                    trim(
                        (string) (
                            $datos[
                                'codigo_barra'
                            ]
                            ?? ''
                        )
                    );

                if (
                    $codigoBarra !== ''
                ) {

                    $codigoExistente =
                        CodigoBarra::query()
                            ->where(
                                'codigo_barra',
                                $codigoBarra
                            )
                            ->lockForUpdate()
                            ->first();

                    if (
                        $codigoExistente
                        && (
                            (int)
                            $codigoExistente
                                ->id_producto
                            !==
                            (int)
                            $producto
                                ->id_producto
                        )
                    ) {

                        throw ValidationException::withMessages([
                            'codigo_barra' => [
                                'Ese codigo de barras ya pertenece a otro producto.',
                            ],
                        ]);
                    }

                    if (
                        $codigoExistente
                    ) {

                        $codigoExistente
                            ->estado =
                                true;

                        $codigoExistente
                            ->save();

                    } else {

                        CodigoBarra::create([
                            'codigo_barra' =>
                                $codigoBarra,

                            'id_producto' =>
                                $producto
                                    ->id_producto,

                            'estado' =>
                                true,
                        ]);
                    }
                }

                /*
                 * Crear un nuevo lote.
                 */
                $lote =
                    LoteProducto::create([
                        'id_producto' =>
                            $producto
                                ->id_producto,

                        'cantidad_inicial' =>
                            $cantidad,

                        'cantidad_disponible' =>
                            $cantidad,

                        'costo_unitario' =>
                            $costoUnitario,

                        'fecha_ingreso' =>
                            now(
                                'America/Lima'
                            )
                                ->toDateString(),

                        'fecha_caducidad' =>
                            $fechaCaducidad,

                        'estado' =>
                            true,
                    ]);

                /*
                 * Mantener stock_producto
                 * sincronizado durante la transicion.
                 */
                $producto
                    ->stock_producto =
                        (int)
                        $producto
                            ->stock_producto
                        + $cantidad;

                /*
                 * costo_producto queda como
                 * ultimo costo de compra conocido.
                 *
                 * El costo historico real permanece
                 * en cada lote.
                 */
                $producto
                    ->costo_producto =
                        $costoUnitario;

                /*
                 * precio_venta solo cambia si
                 * se envio explicitamente.
                 */
                if (
                    isset(
                        $datos[
                            'precio_venta'
                        ]
                    )
                    && $datos[
                        'precio_venta'
                    ] !== null
                ) {

                    $producto
                        ->precio_producto =
                            round(
                                (float)
                                $datos[
                                    'precio_venta'
                                ],
                                2
                            );
                }

                $producto->save();

                /*
                 * Mientras el sistema antiguo todavia
                 * consulte fecha_caducidad en producto,
                 * conservar la fecha mas cercana de
                 * los lotes que aun tienen unidades.
                 */
                $proximaCaducidad =
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
                        ->whereNotNull(
                            'fecha_caducidad'
                        )
                        ->min(
                            'fecha_caducidad'
                        );

                $producto
                    ->fecha_caducidad =
                        $proximaCaducidad;

                $producto->save();

                return $lote
                    ->fresh()
                    ->load([
                        'producto.categoria',
                        'producto.codigosBarra',
                    ]);
            }
        );
    }
}