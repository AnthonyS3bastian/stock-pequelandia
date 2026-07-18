<?php

namespace App\Services;

use App\Models\Producto;
use Illuminate\Database\Eloquent\Collection;

class ProductoService
{
    /**
     * Listar todos los productos.
     */
    public function listar(): Collection
    {
        return Producto::with('categoria')
            ->orderBy('id_producto', 'desc')
            ->get();
    }

    /**
     * Obtener un producto por ID.
     */
    public function obtenerPorId(int $id): Producto
    {
        return Producto::with('categoria')
            ->findOrFail($id);
    }

    /**
     * Crear un nuevo producto.
     */
    public function crear(array $datos): Producto
    {
        return Producto::create([
            'codigo_producto' => $datos['codigo_producto'],
            'nombre_producto' => $datos['nombre_producto'],
            'descripcion_producto' => $datos['descripcion_producto'] ?? null,
            'id_categoria' => $datos['id_categoria'],
            'precio_producto' => $datos['precio_producto'],
            'costo_producto' => $datos['costo_producto'],
            'fecha_caducidad' => $datos['fecha_caducidad'] ?? null,
            'stock_producto' => $datos['stock_producto'],
            'estado' => $datos['estado'],
        ])->load('categoria');
    }

    /**
     * Actualizar un producto existente.
     */
    public function actualizar(int $id, array $datos): Producto
    {
        $producto = Producto::findOrFail($id);

        $producto->update([
            'codigo_producto' => $datos['codigo_producto'],
            'nombre_producto' => $datos['nombre_producto'],
            'descripcion_producto' => $datos['descripcion_producto'] ?? null,
            'id_categoria' => $datos['id_categoria'],
            'precio_producto' => $datos['precio_producto'],
            'costo_producto' => $datos['costo_producto'],
            'fecha_caducidad' => $datos['fecha_caducidad'] ?? null,
            'stock_producto' => $datos['stock_producto'],
            'estado' => $datos['estado'],
        ]);

        return $producto->fresh()->load('categoria');
    }

    /**
     * Eliminar un producto.
     */
    public function eliminar(int $id): void
    {
        $producto = Producto::findOrFail($id);

        $producto->delete();
    }
}