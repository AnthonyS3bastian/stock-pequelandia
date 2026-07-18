<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoriaRequest;
use App\Http\Requests\UpdateCategoriaRequest;
use App\Services\CategoriaService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;

class CategoriaController extends Controller
{
    protected CategoriaService $categoriaService;

    public function __construct(CategoriaService $categoriaService)
    {
        $this->categoriaService = $categoriaService;
    }

    /**
     * Listar todas las categorías.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'mensaje' => 'Lista de categorías obtenida correctamente.',
            'data' => $this->categoriaService->listar(),
        ]);
    }

    /**
     * Obtener una categoría por ID.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $categoria = $this->categoriaService->obtenerPorId($id);

            return response()->json([
                'mensaje' => 'Categoría encontrada.',
                'data' => $categoria,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'mensaje' => 'La categoría no existe.',
            ], 404);
        }
    }

    /**
     * Registrar una nueva categoría.
     */
    public function store(StoreCategoriaRequest $request): JsonResponse
    {
        $categoria = $this->categoriaService->crear($request->validated());

        return response()->json([
            'mensaje' => 'Categoría registrada correctamente.',
            'data' => $categoria,
        ], 201);
    }

    /**
     * Actualizar una categoría.
     */
    public function update(UpdateCategoriaRequest $request, int $id): JsonResponse
    {
        try {
            $categoria = $this->categoriaService->actualizar(
                $id,
                $request->validated()
            );

            return response()->json([
                'mensaje' => 'Categoría actualizada correctamente.',
                'data' => $categoria,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'mensaje' => 'La categoría no existe.',
            ], 404);
        }
    }

    /**
     * Eliminar una categoría.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->categoriaService->eliminar($id);

            return response()->json([
                'mensaje' => 'Categoría eliminada correctamente.',
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'mensaje' => 'La categoría no existe.',
            ], 404);
        }
    }
}