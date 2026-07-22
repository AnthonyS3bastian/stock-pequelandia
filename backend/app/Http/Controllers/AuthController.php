<?php

namespace App\Http\Controllers;

use App\Models\Usuario;
use App\Services\UsuarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    protected UsuarioService $usuarioService;

    public function __construct(
        UsuarioService $usuarioService
    ) {
        $this->usuarioService =
            $usuarioService;
    }

    /**
     * Iniciar sesion.
     */
    public function login(
        Request $request
    ): JsonResponse {

        $datos = $request->validate([
            'nombre_usuario' => [
                'required',
                'string',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $resultado =
            $this->usuarioService->login(
                $datos['nombre_usuario'],
                $datos['password']
            );

        return response()->json([
            'mensaje' =>
                'Inicio de sesion exitoso.',
            'usuario' =>
                $resultado['usuario'],
            'token' =>
                $resultado['token'],
        ]);
    }

    /**
     * Cerrar la sesion actual.
     */
    public function logout(
        Request $request
    ): JsonResponse {

        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if ($usuario) {
            $this->usuarioService->logout(
                $usuario
            );
        }

        return response()->json([
            'mensaje' =>
                'Sesion cerrada correctamente.',
        ]);
    }
}