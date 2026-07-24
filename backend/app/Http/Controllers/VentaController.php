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
    public function registrar(
        StoreVentaRequest $request
    ): JsonResponse {
        try {
            $resultado =
                $this->ventaService->registrar(
                    $request->validated()
                );

            return response()->json([
                'ok' => true,
                'mensaje' =>
                    $resultado['mensaje'],
                'venta' =>
                    $resultado['venta'],
            ], 201);
        } catch (ValidationException $e) {
            $errores = $e->errors();

            $primerMensaje =
                $this->obtenerPrimerMensaje(
                    $errores
                );

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    $primerMensaje,
                'errores' =>
                    $errores,
            ], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'Ocurrió un error al registrar la venta. Intente nuevamente.',
            ], 500);
        }
    }

    /**
     * Obtener el primer mensaje de una validación.
     */
    private function obtenerPrimerMensaje(
        array $errores
    ): string {
        foreach ($errores as $mensajes) {
            if (
                is_array($mensajes)
                && isset($mensajes[0])
            ) {
                return (string) $mensajes[0];
            }

            if (is_string($mensajes)) {
                return $mensajes;
            }
        }

        return 'No se pudo registrar la venta.';
    }
}