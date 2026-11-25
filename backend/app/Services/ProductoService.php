<?php

namespace App\Services;

use App\Models\CodigoBarra;
use App\Models\LoteProducto;
use App\Models\Producto;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductoService
{
    /**
     * Listar productos.
     */
    public function listar(): Collection
    {
        return Producto::query()
            ->with([
                'categoria',

                'codigosBarra' =>
                    function ($consulta): void {

                        $consulta
                            ->where(
                                'estado',
                                true
                            )
                            ->orderBy(
                                'id_codigo_barra'
                            );
                    },
            ])
            ->orderBy(
                'id_producto',
                'desc'
            )
            ->get();
    }

    /**
     * Buscar productos activos para ventas.
     *
     * Permite buscar mediante:
     * - codigo interno
     * - codigo de barras
     * - nombre
     * - categoria
     */
    public function buscarParaVenta(
        string $termino,
        int $limite = 8
    ): Collection {

        $termino =
            trim($termino);

        $limite =
            max(
                1,
                min(
                    $limite,
                    10
                )
            );

        $terminoLike =
            '%'
            . $this->escaparLike(
                $termino
            )
            . '%';

        $inicioTermino =
            $this->escaparLike(
                $termino
            )
            . '%';

        return Producto::query()
            ->with([
                'categoria',

                'codigosBarra' =>
                    function ($consulta): void {

                        $consulta
                            ->where(
                                'estado',
                                true
                            )
                            ->orderBy(
                                'id_codigo_barra'
                            );
                    },
            ])
            ->where(
                'estado',
                true
            )
            ->where(
                function ($consulta) use (
                    $terminoLike
                ): void {

                    $consulta
                        ->where(
                            'codigo_producto',
                            'like',
                            $terminoLike
                        )
                        ->orWhere(
                            'nombre_producto',
                            'like',
                            $terminoLike
                        )
                        ->orWhereHas(
                            'codigosBarra',
                            function (
                                $consultaCodigo
                            ) use (
                                $terminoLike
                            ): void {

                                $consultaCodigo
                                    ->where(
                                        'estado',
                                        true
                                    )
                                    ->where(
                                        'codigo_barra',
                                        'like',
                                        $terminoLike
                                    );
                            }
                        )
                        ->orWhereHas(
                            'categoria',
                            function (
                                $consultaCategoria
                            ) use (
                                $terminoLike
                            ): void {

                                $consultaCategoria
                                    ->where(
                                        'nombre_categoria',
                                        'like',
                                        $terminoLike
                                    );
                            }
                        );
                }
            )
            ->orderByRaw(
                '
                CASE
                    WHEN producto.codigo_producto = ? THEN 0

                    WHEN EXISTS (
                        SELECT 1
                        FROM codigo_barra cb
                        WHERE cb.id_producto = producto.id_producto
                        AND cb.estado = 1
                        AND cb.codigo_barra = ?
                    ) THEN 1

                    WHEN producto.nombre_producto = ? THEN 2

                    WHEN producto.nombre_producto LIKE ? THEN 3

                    ELSE 4
                END
                ',
                [
                    $termino,
                    $termino,
                    $termino,
                    $inicioTermino,
                ]
            )
            ->orderBy(
                'nombre_producto'
            )
            ->limit(
                $limite
            )
            ->get();
    }

    /**
     * Obtener producto por ID.
     */
    public function obtenerPorId(
        int $id
    ): Producto {

        return Producto::query()
            ->with([
                'categoria',

                'codigosBarra' =>
                    function ($consulta): void {

                        $consulta
                            ->orderBy(
                                'id_codigo_barra'
                            );
                    },

                'lotes' =>
                    function ($consulta): void {

                        $consulta
                            ->orderBy(
                                'fecha_ingreso',
                                'desc'
                            )
                            ->orderBy(
                                'id_lote_producto',
                                'desc'
                            );
                    },
            ])
            ->findOrFail(
                $id
            );
    }

    /**
     * Buscar por codigo interno o codigo de barras.
     */
    public function buscarPorCodigo(
        string $codigo
    ): Producto {

        $codigo =
            trim($codigo);

        return Producto::query()
            ->with([
                'categoria',

                'codigosBarra' =>
                    function ($consulta): void {

                        $consulta
                            ->where(
                                'estado',
                                true
                            )
                            ->orderBy(
                                'id_codigo_barra'
                            );
                    },
            ])
            ->where(
                'estado',
                true
            )
            ->where(
                function ($consulta) use (
                    $codigo
                ): void {

                    $consulta
                        ->where(
                            'codigo_producto',
                            $codigo
                        )
                        ->orWhereHas(
                            'codigosBarra',
                            function (
                                $consultaCodigo
                            ) use (
                                $codigo
                            ): void {

                                $consultaCodigo
                                    ->where(
                                        'estado',
                                        true
                                    )
                                    ->where(
                                        'codigo_barra',
                                        $codigo
                                    );
                            }
                        );
                }
            )
            ->firstOrFail();
    }

    /**
     * Crear producto.
     *
     * codigo_producto se genera automaticamente
     * despues de obtener el ID.
     */
    public function crear(
        array $datos
    ): Producto {

        return DB::transaction(
            function () use (
                $datos
            ): Producto {

                $stockInicial =
                    (int) (
                        $datos[
                            'stock_producto'
                        ]
                        ?? 0
                    );

                $costoInicial =
                    (float) (
                        $datos[
                            'costo_producto'
                        ]
                        ?? 0
                    );

                $fechaCaducidad =
                    $datos[
                        'fecha_caducidad'
                    ]
                    ?? null;

                /*
                 * Codigo temporal necesario porque
                 * codigo_producto es UNIQUE y obligatorio.
                 */
                $codigoTemporal =
                    'TMP_'
                    . Str::uuid()
                        ->toString();

                $producto =
                    Producto::create([
                        'codigo_producto' =>
                            $codigoTemporal,

                        'nombre_producto' =>
                            trim(
                                $datos[
                                    'nombre_producto'
                                ]
                            ),

                        'descripcion_producto' =>
                            isset(
                                $datos[
                                    'descripcion_producto'
                                ]
                            )
                                ? trim(
                                    $datos[
                                        'descripcion_producto'
                                    ]
                                )
                                : null,

                        'id_categoria' =>
                            $datos[
                                'id_categoria'
                            ],

                        'precio_producto' =>
                            $datos[
                                'precio_producto'
                            ],

                        /*
                         * Campos heredados.
                         * Se mantienen sincronizados
                         * durante la transicion.
                         */
                        'costo_producto' =>
                            $costoInicial,

                        'fecha_caducidad' =>
                            $stockInicial > 0
                                ? $fechaCaducidad
                                : null,

                        'stock_producto' =>
                            $stockInicial,

                        'stock_minimo_producto' =>
                            $datos[
                                'stock_minimo_producto'
                            ]
                            ?? 0,

                        'estado' =>
                            $datos[
                                'estado'
                            ]
                            ?? true,
                    ]);

                /*
                 * Codigo interno definitivo.
                 */
                $producto
                    ->codigo_producto =
                        $this
                            ->generarCodigoInterno(
                                $producto
                                    ->id_producto
                            );

                $producto->save();

                /*
                 * Guardar codigo(s) de barras.
                 */
                $codigosBarra =
                    $this
                        ->extraerCodigosBarra(
                            $datos
                        );

                foreach (
                    $codigosBarra
                    as $codigo
                ) {

                    CodigoBarra::create([
                        'codigo_barra' =>
                            $codigo,

                        'id_producto' =>
                            $producto
                                ->id_producto,

                        'estado' =>
                            true,
                    ]);
                }

                /*
                 * Si se registra stock inicial,
                 * crear primer lote.
                 */
                if (
                    $stockInicial > 0
                ) {

                    LoteProducto::create([
                        'id_producto' =>
                            $producto
                                ->id_producto,

                        'cantidad_inicial' =>
                            $stockInicial,

                        'cantidad_disponible' =>
                            $stockInicial,

                        'costo_unitario' =>
                            $costoInicial,

                        'fecha_ingreso' =>
                            now()
                                ->toDateString(),

                        'fecha_caducidad' =>
                            $fechaCaducidad,

                        'estado' =>
                            true,
                    ]);
                }

                return $producto
                    ->fresh()
                    ->load([
                        'categoria',
                        'codigosBarra',
                        'lotes',
                    ]);
            }
        );
    }

    /**
     * Actualizar informacion general.
     *
     * El codigo interno, stock, costo
     * y caducidad ya no se editan aqui.
     */
    public function actualizar(
        int $id,
        array $datos
    ): Producto {

        return DB::transaction(
            function () use (
                $id,
                $datos
            ): Producto {

                $producto =
                    Producto::query()
                        ->lockForUpdate()
                        ->findOrFail(
                            $id
                        );

                $producto->update([
                    'nombre_producto' =>
                        trim(
                            $datos[
                                'nombre_producto'
                            ]
                        ),

                    'descripcion_producto' =>
                        isset(
                            $datos[
                                'descripcion_producto'
                            ]
                        )
                            ? trim(
                                $datos[
                                    'descripcion_producto'
                                ]
                            )
                            : null,

                    'id_categoria' =>
                        $datos[
                            'id_categoria'
                        ],

                    'precio_producto' =>
                        $datos[
                            'precio_producto'
                        ],

                    'stock_minimo_producto' =>
                        $datos[
                            'stock_minimo_producto'
                        ],

                    'estado' =>
                        $datos[
                            'estado'
                        ],
                ]);

                /*
                 * Solo sincronizar codigos si
                 * el cliente envia explicitamente
                 * codigos_barra.
                 */
                if (
                    array_key_exists(
                        'codigos_barra',
                        $datos
                    )
                ) {

                    $this
                        ->sincronizarCodigosBarra(
                            $producto,
                            $datos[
                                'codigos_barra'
                            ]
                        );
                }

                return $producto
                    ->fresh()
                    ->load([
                        'categoria',
                        'codigosBarra',
                        'lotes',
                    ]);
            }
        );
    }

    /**
     * Actualizacion temporal/manual de stock.
     *
     * Mantiene sincronizado stock_producto
     * con lote_producto.
     */
    public function actualizarStock(
        int $id,
        string $operacion,
        int $cantidad
    ): Producto {

        return DB::transaction(
            function () use (
                $id,
                $operacion,
                $cantidad
            ): Producto {

                $producto =
                    Producto::query()
                        ->where(
                            'id_producto',
                            $id
                        )
                        ->lockForUpdate()
                        ->firstOrFail();

                $stockActual =
                    (int)
                    $producto
                        ->stock_producto;

                $nuevoStock =
                    match (
                        $operacion
                    ) {

                        'agregar' =>
                            $stockActual
                            + $cantidad,

                        'retirar' =>
                            $stockActual
                            - $cantidad,

                        'establecer' =>
                            $cantidad,

                        default =>
                            $stockActual,
                    };

                if (
                    $nuevoStock < 0
                ) {

                    throw ValidationException::withMessages([
                        'cantidad' => [
                            'No se puede retirar una cantidad mayor al stock actual.',
                        ],
                    ]);
                }

                $diferencia =
                    $nuevoStock
                    - $stockActual;

                /*
                 * Aumento manual.
                 *
                 * Se crea un lote de ajuste usando
                 * el ultimo costo conocido.
                 */
                if (
                    $diferencia > 0
                ) {

                    LoteProducto::create([
                        'id_producto' =>
                            $producto
                                ->id_producto,

                        'cantidad_inicial' =>
                            $diferencia,

                        'cantidad_disponible' =>
                            $diferencia,

                        'costo_unitario' =>
                            $producto
                                ->costo_producto,

                        'fecha_ingreso' =>
                            now()
                                ->toDateString(),

                        'fecha_caducidad' =>
                            $producto
                                ->fecha_caducidad,

                        'estado' =>
                            true,
                    ]);
                }

                /*
                 * Reduccion manual.
                 * Descuenta lotes en orden FIFO.
                 */
                if (
                    $diferencia < 0
                ) {

                    $this
                        ->descontarDeLotes(
                            $producto,
                            abs(
                                $diferencia
                            )
                        );
                }

                $producto
                    ->stock_producto =
                        $nuevoStock;

                $producto->save();

                return $producto
                    ->fresh()
                    ->load([
                        'categoria',
                        'codigosBarra',
                        'lotes',
                    ]);
            }
        );
    }

    /**
     * Activar o desactivar producto.
     */
    public function cambiarEstado(
        int $id
    ): Producto {

        $producto =
            Producto::findOrFail(
                $id
            );

        $producto->estado =
            !$producto->estado;

        $producto->save();

        return $producto
            ->fresh()
            ->load([
                'categoria',
                'codigosBarra',
            ]);
    }

    /**
     * Eliminacion fisica solo si el producto
     * no tiene historial relacionado.
     */
    public function eliminar(
        int $id
    ): void {

        $producto =
            Producto::findOrFail(
                $id
            );

        if (
            $producto
                ->detalleVentas()
                ->exists()
            || $producto
                ->codigosBarra()
                ->exists()
            || $producto
                ->lotes()
                ->exists()
        ) {

            throw ValidationException::withMessages([
                'producto' => [
                    'El producto posee historial y no puede eliminarse. Puede desactivarlo.',
                ],
            ]);
        }

        $producto->delete();
    }

    /**
     * Generar codigo interno.
     *
     * Ejemplo:
     * id 1 -> PROD000001
     */
    private function generarCodigoInterno(
        int $idProducto
    ): string {

        return 'PROD'
            . str_pad(
                (string)
                $idProducto,
                6,
                '0',
                STR_PAD_LEFT
            );
    }

    /**
     * Obtener codigos de barras de la solicitud.
     *
     * codigo_producto se mantiene como entrada
     * legacy hasta adaptar el frontend.
     */
    private function extraerCodigosBarra(
        array $datos
    ): array {

        $codigos =
            $datos[
                'codigos_barra'
            ]
            ?? [];

        if (
            isset(
                $datos[
                    'codigo_producto'
                ]
            )
        ) {

            $codigoLegacy =
                trim(
                    (string)
                    $datos[
                        'codigo_producto'
                    ]
                );

            if (
                $codigoLegacy !== ''
            ) {

                array_unshift(
                    $codigos,
                    $codigoLegacy
                );
            }
        }

        return $this
            ->normalizarCodigos(
                $codigos
            );
    }

    /**
     * Sincronizar los codigos activos
     * de un producto.
     */
    private function sincronizarCodigosBarra(
        Producto $producto,
        array $codigos
    ): void {

        $codigos =
            $this
                ->normalizarCodigos(
                    $codigos
                );

        /*
         * Verificar que ningun codigo pertenezca
         * a otro producto.
         */
        foreach (
            $codigos
            as $codigo
        ) {

            $ocupado =
                CodigoBarra::query()
                    ->where(
                        'codigo_barra',
                        $codigo
                    )
                    ->where(
                        'id_producto',
                        '!=',
                        $producto
                            ->id_producto
                    )
                    ->exists();

            if (
                $ocupado
            ) {

                throw ValidationException::withMessages([
                    'codigos_barra' => [
                        "El codigo de barras {$codigo} ya pertenece a otro producto.",
                    ],
                ]);
            }
        }

        $existentes =
            CodigoBarra::query()
                ->where(
                    'id_producto',
                    $producto
                        ->id_producto
                )
                ->get();

        /*
         * Activar los enviados y desactivar
         * los que ya no fueron enviados.
         */
        foreach (
            $existentes
            as $codigoExistente
        ) {

            $codigoExistente
                ->estado =
                    in_array(
                        $codigoExistente
                            ->codigo_barra,
                        $codigos,
                        true
                    );

            $codigoExistente
                ->save();
        }

        /*
         * Crear codigos que aun no existen.
         */
        foreach (
            $codigos
            as $codigo
        ) {

            $registro =
                CodigoBarra::query()
                    ->where(
                        'codigo_barra',
                        $codigo
                    )
                    ->first();

            if (
                $registro
            ) {

                if (
                    !$registro->estado
                ) {

                    $registro
                        ->estado =
                            true;

                    $registro
                        ->save();
                }

                continue;
            }

            CodigoBarra::create([
                'codigo_barra' =>
                    $codigo,

                'id_producto' =>
                    $producto
                        ->id_producto,

                'estado' =>
                    true,
            ]);
        }
    }

    /**
     * Descontar stock de lotes FIFO.
     */
    private function descontarDeLotes(
        Producto $producto,
        int $cantidad
    ): void {

        $pendiente =
            $cantidad;

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
                ->orderBy(
                    'fecha_ingreso'
                )
                ->orderBy(
                    'id_lote_producto'
                )
                ->lockForUpdate()
                ->get();

        foreach (
            $lotes
            as $lote
        ) {

            if (
                $pendiente <= 0
            ) {
                break;
            }

            $disponible =
                (int)
                $lote
                    ->cantidad_disponible;

            $descontar =
                min(
                    $disponible,
                    $pendiente
                );

            $lote
                ->cantidad_disponible =
                    $disponible
                    - $descontar;

            $lote->save();

            $pendiente -=
                $descontar;
        }

        if (
            $pendiente > 0
        ) {

            throw ValidationException::withMessages([
                'stock' => [
                    'El stock registrado no coincide con los lotes disponibles.',
                ],
            ]);
        }
    }

    /**
     * Limpiar codigos vacios y repetidos.
     */
    private function normalizarCodigos(
        array $codigos
    ): array {

        $resultado = [];

        foreach (
            $codigos
            as $codigo
        ) {

            $codigo =
                trim(
                    (string)
                    $codigo
                );

            if (
                $codigo === ''
            ) {
                continue;
            }

            if (
                !in_array(
                    $codigo,
                    $resultado,
                    true
                )
            ) {

                $resultado[] =
                    $codigo;
            }
        }

        return $resultado;
    }

    /**
     * Escapar caracteres LIKE.
     */
    private function escaparLike(
        string $valor
    ): string {

        return addcslashes(
            $valor,
            '\\%_'
        );
    }
}