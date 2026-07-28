<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Services\DashboardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class DashboardController extends Controller
{
    public function __construct(
        private readonly DashboardService $dashboardService
    ) {
    }

    public function index(
        Request $request
    ): JsonResponse {
        try {
            $usuario =
                $request->user();

            if (!$usuario instanceof Usuario) {
                return response()->json([
                    'ok' => false,
                    'mensaje' =>
                        'No se pudo identificar al usuario.',
                ], 401);
            }

            return response()->json([
                'ok' => true,
                'mensaje' =>
                    'Dashboard obtenido correctamente.',
                'dashboard' =>
                    $this->dashboardService
                        ->obtenerDashboard(
                            $usuario
                        ),
            ]);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'mensaje' =>
                    'Ocurrió un error al cargar el dashboard.',
            ], 500);
        }
    }
}