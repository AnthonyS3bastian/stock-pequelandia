<?php

namespace App\Services;

use App\Models\Categoria;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class CategoriaService
{
    /**
     * Listar categorias con la cantidad de productos asociados.
     */
    public function listar(): Collection
    {
        return Categoria::query()
            ->withCount('productos')
            ->orderBy('nombre_categoria')
            ->get();
    }

    /**
     * Obtener una categoria por ID.
     */
    public function obtenerPorId(int $id): Categoria
    {
        return Categoria::query()
            ->withCount('productos')
            ->findOrFail($id);
    }

    /**
     * Crear una nueva categoria.
     */
    public function crear(array $datos): Categoria
    {
        $categoria = Categoria::create([
            'nombre_categoria' => $datos['nombre_categoria'],
            'descripcion_categoria' =>
                $datos['descripcion_categoria'] ?? null,
            'estado' => $datos['estado'],
        ]);

        return $categoria
            ->loadCount('productos');
    }

    /**
     * Actualizar una categoria existente.
     */
    public function actualizar(
        int $id,
        array $datos
    ): Categoria {
        $categoria = Categoria::findOrFail($id);

        $categoria->update([
            'nombre_categoria' => $datos['nombre_categoria'],
            'descripcion_categoria' =>
                $datos['descripcion_categoria'] ?? null,
            'estado' => $datos['estado'],
        ]);

        return $categoria
            ->fresh()
            ->loadCount('productos');
    }

    /**
     * Eliminar una categoria solo cuando no tenga productos.
     */
    public function eliminar(int $id): void
    {
        $categoria = Categoria::findOrFail($id);

        $cantidadProductos =
            $categoria->productos()->count();

        if ($cantidadProductos > 0) {
            throw ValidationException::withMessages([
                'categoria' => [
                    'No se puede eliminar la categoria porque tiene '
                    .$cantidadProductos
                    .' producto(s) asociado(s).',
                ],
            ]);
        }

        $categoria->delete();
    }
}
