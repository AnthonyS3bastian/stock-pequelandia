<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdministradorMiddleware
{
    /**
     * Verifica que el usuario autenticado tenga rol de administrador.
     */
    public function handle(
        Request $request,
        Closure $next
    ): Response|JsonResponse {

        $usuario = $request->user();

        if (!$usuario) {
            return response()->json([
                'mensaje' => 'No autenticado.',
            ], 401);
        }

        if (!$usuario->estado_usuario) {
            $usuario->tokens()->delete();

            return response()->json([
                'mensaje' => 'La cuenta se encuentra inactiva.',
            ], 403);
        }

        if (
            strtoupper($usuario->rol_usuario)
            !== 'ADMINISTRADOR'
        ) {
            return response()->json([
                'mensaje' => 'No autorizado para realizar esta accion.',
            ], 403);
        }

        return $next($request);
    }
}