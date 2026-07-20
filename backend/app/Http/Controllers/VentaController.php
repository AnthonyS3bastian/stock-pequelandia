<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreVentaRequest;
use App\Services\VentaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Throwable;

class VentaController extends Controller
{
    public function __construct(
        private readonly VentaService $ventaService
    ) {
    }

    /**
     * Registrar una nueva venta.
     */
    public function registrar(StoreVentaRequest $request): JsonResponse
    {
        try {
            $resultado = $this->ventaService->registrar(
                $request->validated()
            );

            return response()->json([
                'ok' => true,
                'mensaje' => $resultado['mensaje'],
                'venta' => $resultado['venta'],
            ], 201);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'mensaje' => 'No se pudo registrar la venta.',
                'errores' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' => 'Ocurrió un error al registrar la venta.',
            ], 500);
        }
    }
}