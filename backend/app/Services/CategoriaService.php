<?php

namespace App\Services;

use App\Models\Categoria;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class CategoriaService
{
    /**
     * Listar todas las categorías.
     */
    public function listar(): Collection
    {
        return Categoria::orderBy('id_categoria', 'desc')->get();
    }

    /**
     * Obtener una categoría por ID.
     */
    public function obtenerPorId(int $id): Categoria
    {
        return Categoria::findOrFail($id);
    }

    /**
     * Crear una nueva categoría.
     */
    public function crear(array $datos): Categoria
    {
        return Categoria::create([
            'nombre_categoria' => $datos['nombre_categoria'],
            'descripcion_categoria' => $datos['descripcion_categoria'] ?? null,
            'estado' => $datos['estado'],
        ]);
    }

    /**
     * Actualizar una categoría existente.
     */
    public function actualizar(int $id, array $datos): Categoria
    {
        $categoria = Categoria::findOrFail($id);

        $categoria->update([
            'nombre_categoria' => $datos['nombre_categoria'],
            'descripcion_categoria' => $datos['descripcion_categoria'] ?? null,
            'estado' => $datos['estado'],
        ]);

        return $categoria->fresh();
    }

    /**
     * Eliminar una categoría.
     */
    public function eliminar(int $id): void
    {
        $categoria = Categoria::findOrFail($id);

        $categoria->delete();
    }
}