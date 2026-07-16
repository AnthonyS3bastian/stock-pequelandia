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
    public function buscarPorNombre(string $nombreUsuario): ?Usuario
    {
        return Usuario::where('nombre_usuario', $nombreUsuario)->first();
    }

    /**
     * Iniciar sesion.
     */
    public function login(string $nombreUsuario, string $password): array
    {
        $usuario = $this->buscarPorNombre($nombreUsuario);

        if (!$usuario || !Hash::check($password, $usuario->password)) {
            throw ValidationException::withMessages([
                'credenciales' => [
                    'Usuario o contrasena incorrectos.'
                ]
            ]);
        }

        // Elimina tokens anteriores
        $usuario->tokens()->delete();

        // Genera un nuevo token
        $token = $usuario->createToken('auth_token')->plainTextToken;

        return [
            'usuario' => $usuario,
            'token' => $token
        ];
    }
}