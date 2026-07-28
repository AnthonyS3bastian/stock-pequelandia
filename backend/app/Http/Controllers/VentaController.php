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
            return $this->respuestaValidacion(
                $e,
                'No se pudo registrar la venta.'
            );
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
     * Buscar una venta por número de comprobante.
     */
    public function buscarPorComprobante(
        string $numeroComprobante
    ): JsonResponse {
        try {
            $resultado =
                $this->ventaService
                    ->buscarPorNumeroComprobante(
                        $numeroComprobante
                    );

            return response()->json([
                'ok' => true,
                'mensaje' =>
                    'Venta encontrada correctamente.',
                'venta' =>
                    $resultado['venta'],
                'puede_anular' =>
                    $resultado['puede_anular'],
                'motivo_bloqueo' =>
                    $resultado['motivo_bloqueo'],
            ]);
        } catch (ValidationException $e) {
            return $this->respuestaValidacion(
                $e,
                'No se encontró la venta.'
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'Ocurrió un error al buscar la venta.',
            ], 500);
        }
    }

    /**
     * Anular una venta del día actual.
     */
    public function anular(
        string $numeroComprobante
    ): JsonResponse {
        try {
            $resultado =
                $this->ventaService->anular(
                    $numeroComprobante
                );

            return response()->json([
                'ok' => true,
                'mensaje' =>
                    $resultado['mensaje'],
                'venta' =>
                    $resultado['venta'],
            ]);
        } catch (ValidationException $e) {
            return $this->respuestaValidacion(
                $e,
                'No se pudo anular la venta.'
            );
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'Ocurrió un error al anular la venta.',
            ], 500);
        }
    }

    /**
     * Formatear errores de validación.
     */
    private function respuestaValidacion(
        ValidationException $e,
        string $mensajePredeterminado
    ): JsonResponse {
        $errores = $e->errors();

        return response()->json([
            'ok' => false,
            'mensaje' =>
                $this->obtenerPrimerMensaje(
                    $errores,
                    $mensajePredeterminado
                ),
            'errores' =>
                $errores,
        ], 422);
    }

    private function obtenerPrimerMensaje(
        array $errores,
        string $mensajePredeterminado
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

        return $mensajePredeterminado;
    }
}