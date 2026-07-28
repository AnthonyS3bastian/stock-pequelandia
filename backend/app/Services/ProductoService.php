<?php

namespace App\Services;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProductoService
{
    /**
     * Listar todos los productos.
     */
    public function listar(): Collection
    {
        return Producto::with('categoria')
            ->orderBy(
                'id_producto',
                'desc'
            )
            ->get();
    }

    /**
     * Buscar productos activos para ventas.
     *
     * Busca por codigo, nombre o categoria
     * y limita la cantidad de resultados.
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
            '%' . $this->escaparLike(
                $termino
            ) . '%';

        $inicioTermino =
            $this->escaparLike(
                $termino
            ) . '%';

        return Producto::query()
            ->with('categoria')
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
                        WHEN codigo_producto = ? THEN 0
                        WHEN nombre_producto = ? THEN 1
                        WHEN nombre_producto LIKE ? THEN 2
                        ELSE 3
                    END
                ',
                [
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
     * Obtener un producto por ID.
     */
    public function obtenerPorId(
        int $id
    ): Producto {
        return Producto::with('categoria')
            ->findOrFail($id);
    }

    /**
     * Buscar un producto por codigo de barras.
     */
    public function buscarPorCodigo(
        string $codigo
    ): Producto {
        return Producto::with('categoria')
            ->where(
                'codigo_producto',
                $codigo
            )
            ->firstOrFail();
    }

    /**
     * Crear un nuevo producto.
     */
    public function crear(
        array $datos
    ): Producto {
        $producto = Producto::create([
            'codigo_producto' =>
                $datos['codigo_producto'],

            'nombre_producto' =>
                $datos['nombre_producto'],

            'descripcion_producto' =>
                $datos['descripcion_producto']
                ?? null,

            'id_categoria' =>
                $datos['id_categoria'],

            'precio_producto' =>
                $datos['precio_producto'],

            'costo_producto' =>
                $datos['costo_producto'],

            'fecha_caducidad' =>
                $datos['fecha_caducidad']
                ?? null,

            'stock_producto' =>
                $datos['stock_producto'],

            'stock_minimo_producto' =>
                $datos['stock_minimo_producto']
                ?? 0,

            'estado' =>
                $datos['estado'],
        ]);

        return $producto
            ->load('categoria');
    }

    /**
     * Actualizar la informacion general
     * de un producto.
     *
     * El stock actual se conserva.
     */
    public function actualizar(
        int $id,
        array $datos
    ): Producto {
        $producto =
            Producto::findOrFail($id);

        $producto->update([
            'codigo_producto' =>
                $datos['codigo_producto'],

            'nombre_producto' =>
                $datos['nombre_producto'],

            'descripcion_producto' =>
                $datos['descripcion_producto']
                ?? null,

            'id_categoria' =>
                $datos['id_categoria'],

            'precio_producto' =>
                $datos['precio_producto'],

            'costo_producto' =>
                $datos['costo_producto'],

            'fecha_caducidad' =>
                $datos['fecha_caducidad']
                ?? null,

            'stock_minimo_producto' =>
                $datos[
                    'stock_minimo_producto'
                ],

            'estado' =>
                $datos['estado'],
        ]);

        return $producto
            ->fresh()
            ->load('categoria');
    }

    /**
     * Actualizar exclusivamente el stock
     * de un producto.
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
                    (int) $producto
                        ->stock_producto;

                $nuevoStock =
                    match ($operacion) {

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

                if ($nuevoStock < 0) {

                    throw ValidationException::withMessages([
                        'cantidad' =>
                            'No se puede retirar una cantidad mayor al stock actual.',
                    ]);

                }

                $producto
                    ->stock_producto =
                        $nuevoStock;

                $producto->save();

                return $producto
                    ->fresh()
                    ->load('categoria');

            }
        );
    }

    /**
     * Cambiar el estado de un producto.
     *
     * Activo pasa a inactivo.
     * Inactivo pasa a activo.
     */
    public function cambiarEstado(
        int $id
    ): Producto {
        $producto =
            Producto::findOrFail($id);

        $producto->estado =
            !$producto->estado;

        $producto->save();

        return $producto
            ->fresh()
            ->load('categoria');
    }

    /**
     * Eliminar un producto.
     *
     * Esta funcionalidad se mantiene
     * temporalmente, pero la interfaz
     * utilizara activacion y desactivacion.
     */
    public function eliminar(
        int $id
    ): void {
        $producto =
            Producto::findOrFail($id);

        $producto->delete();
    }

    /**
     * Escapar caracteres especiales
     * utilizados por consultas LIKE.
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