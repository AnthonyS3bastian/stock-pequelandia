<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductoRequest;
use App\Http\Requests\UpdateProductoRequest;
use App\Services\ProductoService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;

class ProductoController extends Controller
{
    protected ProductoService $productoService;

    public function __construct(ProductoService $productoService)
    {
        $this->productoService = $productoService;
    }

    /**
     * Listar todos los productos.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'mensaje' => 'Lista de productos obtenida correctamente.',
            'data' => $this->productoService->listar(),
        ]);
    }

    /**
     * Obtener un producto por ID.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $producto = $this->productoService->obtenerPorId($id);

            return response()->json([
                'mensaje' => 'Producto encontrado.',
                'data' => $producto,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'mensaje' => 'El producto no existe.',
            ], 404);
        }
    }

    /**
     * Registrar un nuevo producto.
     */
    public function store(StoreProductoRequest $request): JsonResponse
    {
        $producto = $this->productoService->crear(
            $request->validated()
        );

        return response()->json([
            'mensaje' => 'Producto registrado correctamente.',
            'data' => $producto,
        ], 201);
    }

    /**
     * Actualizar un producto.
     */
    public function update(UpdateProductoRequest $request, int $id): JsonResponse
    {
        try {
            $producto = $this->productoService->actualizar(
                $id,
                $request->validated()
            );

            return response()->json([
                'mensaje' => 'Producto actualizado correctamente.',
                'data' => $producto,
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'mensaje' => 'El producto no existe.',
            ], 404);
        }
    }

    /**
     * Eliminar un producto.
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->productoService->eliminar($id);

            return response()->json([
                'mensaje' => 'Producto eliminado correctamente.',
            ]);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'mensaje' => 'El producto no existe.',
            ], 404);
        }
    }
}