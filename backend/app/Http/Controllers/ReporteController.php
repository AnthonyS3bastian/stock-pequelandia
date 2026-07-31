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

    public function inventario(): JsonResponse
    {
        return $this->responderReporte(
            fn (): array =>
                $this->reporteService
                    ->obtenerResumenInventario(),
            'de inventario'
        );
    }

    public function diario(
        Request $request
    ): JsonResponse {
        return $this->responderReporte(
            fn (): array =>
                $this->reporteService
                    ->obtenerReporteDiario(
                        $request->query('fecha')
                    ),
            'diario'
        );
    }

    public function semanal(
        Request $request
    ): JsonResponse {
        return $this->responderReporte(
            fn (): array =>
                $this->reporteService
                    ->obtenerReporteSemanal(
                        $request->query('fecha')
                    ),
            'semanal'
        );
    }

    public function mensual(
        Request $request
    ): JsonResponse {
        return $this->responderReporte(
            fn (): array =>
                $this->reporteService
                    ->obtenerReporteMensual(
                        $request->query('fecha')
                    ),
            'mensual'
        );
    }

    private function responderReporte(
        callable $consulta,
        string $tipoReporte
    ): JsonResponse {
        try {
            return response()->json([
                'ok' => true,
                'mensaje' =>
                    "Reporte {$tipoReporte} obtenido correctamente.",
                'reporte' => $consulta(),
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'ok' => false,
                'mensaje' =>
                    "No se pudo obtener el reporte {$tipoReporte}.",
                'errores' => $e->errors(),
            ], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    "Ocurrió un error al obtener el reporte {$tipoReporte}.",
            ], 500);
        }
    }
}