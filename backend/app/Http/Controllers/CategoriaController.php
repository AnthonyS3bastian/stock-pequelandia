<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoriaRequest;
use App\Http\Requests\UpdateCategoriaRequest;
use App\Services\CategoriaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class CategoriaController extends Controller
{
    public function __construct(
        private readonly CategoriaService $categoriaService
    ) {
    }

    /**
     * Listar todas las categorias.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'mensaje' => 'Lista de categorias obtenida correctamente.',
            'data' => $this->categoriaService->listar(),
        ]);
    }

    /**
     * Obtener una categoria por ID.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $categoria = $this->categoriaService->obtenerPorId($id);

            return response()->json([
                'mensaje' => 'Categoria encontrada.',
                'data' => $categoria,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'mensaje' => 'La categoria no existe.',
            ], 404);
        }
    }

    /**
     * Registrar una nueva categoria.
     */
    public function store(
        StoreCategoriaRequest $request
    ): JsonResponse {
        $categoria = $this->categoriaService->crear(
            $request->validated()
        );

        return response()->json([
            'mensaje' => 'Categoria registrada correctamente.',
            'data' => $categoria,
        ], 201);
    }

    /**
     * Actualizar una categoria.
     */
    public function update(
        UpdateCategoriaRequest $request,
        int $id
    ): JsonResponse {
        try {
            $categoria = $this->categoriaService->actualizar(
                $id,
                $request->validated()
            );

            return response()->json([
                'mensaje' => 'Categoria actualizada correctamente.',
                'data' => $categoria,
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'mensaje' => 'La categoria no existe.',
            ], 404);
        }
    }

    /**
     * Eliminar una categoria sin productos asociados.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->categoriaService->eliminar($id);

            return response()->json([
                'mensaje' => 'Categoria eliminada correctamente.',
            ]);
        } catch (ModelNotFoundException) {
            return response()->json([
                'mensaje' => 'La categoria no existe.',
            ], 404);
        } catch (ValidationException $exception) {
            $errores = $exception->errors();

            return response()->json([
                'mensaje' =>
                    $errores['categoria'][0]
                    ?? 'No se pudo eliminar la categoria.',
                'errors' => $errores,
            ], 422);
        }
    }
}
