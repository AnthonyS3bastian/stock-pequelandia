<?php

namespace App\Services;

use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UsuarioService
{
    /**
     * Buscar un usuario por su nombre de usuario.
     */
    public function buscarPorNombre(
        string $nombreUsuario
    ): ?Usuario {

        return Usuario::where(
            'nombre_usuario',
            $nombreUsuario
        )
            ->with('personal')
            ->first();
    }

    /**
     * Obtener el perfil del usuario autenticado.
     */
    public function obtenerPerfil(
        Usuario $usuario
    ): Usuario {

        return $usuario->load('personal');

    }

    /**
     * Iniciar sesion.
     */
    public function login(
        string $nombreUsuario,
        string $password
    ): array {

        $usuario = $this->buscarPorNombre(
            $nombreUsuario
        );

        if (
            !$usuario ||
            !Hash::check(
                $password,
                $usuario->password
            )
        ) {
            throw ValidationException::withMessages([
                'credenciales' => [
                    'Usuario o contrasena incorrectos.',
                ],
            ]);
        }

        if (!$usuario->estado_usuario) {
            throw ValidationException::withMessages([
                'credenciales' => [
                    'La cuenta se encuentra inactiva. Comuniquese con la administradora.',
                ],
            ]);
        }

        /*
        |--------------------------------------------------------------------------
        | Cerrar sesiones anteriores
        |--------------------------------------------------------------------------
        */

        $usuario->tokens()->delete();

        /*
        |--------------------------------------------------------------------------
        | Crear token de sesion
        |--------------------------------------------------------------------------
        */

        $token = $usuario
            ->createToken('auth_token')
            ->plainTextToken;

        return [
            'usuario' => $usuario,
            'token' => $token,
        ];
    }

    /**
     * Cerrar la sesion actual.
     */
    public function logout(
        Usuario $usuario
    ): void {

        $tokenActual =
            $usuario->currentAccessToken();

        if ($tokenActual) {
            $tokenActual->delete();
        }
    }
}