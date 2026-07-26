<?php

namespace App\Http\Controllers;

use App\Http\Requests\CambiarPasswordRequest;
use App\Models\Usuario;
use App\Services\UsuarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private readonly UsuarioService $usuarioService
    ) {
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
     * Obtener el perfil del usuario autenticado.
     */
    public function perfil(
        Request $request
    ): JsonResponse {

        /** @var Usuario|null $usuario */
        $usuario = $request->user();

        if (!$usuario) {
            return response()->json([
                'mensaje' =>
                    'Usuario no autenticado.',
            ], 401);
        }

        $perfil =
            $this->usuarioService
                ->obtenerPerfil($usuario);

        return response()->json([
            'perfil' => $perfil,
        ]);
    }

    /**
     * Cambiar la contrasena propia.
     */
    public function cambiarPassword(
        CambiarPasswordRequest $request
    ): JsonResponse {

        /** @var Usuario $usuario */
        $usuario = $request->user();

        $datos = $request->validated();

        $this->usuarioService
            ->cambiarPassword(
                $usuario,
                $datos['password_actual'],
                $datos['password']
            );

        return response()->json([
            'mensaje' =>
                'Contrasena actualizada correctamente.',
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
