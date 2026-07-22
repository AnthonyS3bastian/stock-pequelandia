<?php

namespace App\Http\Controllers;

use App\Services\ReporteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

class ReporteController extends Controller
{
    public function __construct(
        private readonly ReporteService $reporteService
    ) {
    }

    /**
     * Obtener el reporte diario.
     */
    public function diario(
        Request $request
    ): JsonResponse {
        try {
            $reporte = $this->reporteService
                ->obtenerReporteDiario(
                    $request->query('fecha')
                );

            return response()->json([
                'ok' => true,
                'mensaje' =>
                    'Reporte diario obtenido correctamente.',
                'reporte' => $reporte,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'No se pudo obtener el reporte diario.',
                'errores' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'Ocurrió un error al obtener el reporte diario.',
            ], 500);
        }
    }

    /**
     * Obtener el reporte semanal.
     */
    public function semanal(
        Request $request
    ): JsonResponse {
        try {
            $reporte = $this->reporteService
                ->obtenerReporteSemanal(
                    $request->query('fecha')
                );

            return response()->json([
                'ok' => true,
                'mensaje' =>
                    'Reporte semanal obtenido correctamente.',
                'reporte' => $reporte,
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'No se pudo obtener el reporte semanal.',
                'errores' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'Ocurrió un error al obtener el reporte semanal.',
            ], 500);
        }
    }
}