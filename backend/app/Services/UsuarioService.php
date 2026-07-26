<?php

namespace App\Services;

use App\Models\Personal;
use App\Models\Usuario;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
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
     * Listar usuarios con sus datos personales.
     */
    public function listarUsuarios(): Collection
    {
        return Usuario::query()
            ->with('personal')
            ->orderByRaw(
                "CASE WHEN rol_usuario = 'ADMINISTRADOR' THEN 0 ELSE 1 END"
            )
            ->orderBy('nombre_usuario')
            ->get();
    }

    /**
     * Crear una cuenta de empleado.
     * La contrasena inicial sera su DNI.
     */
    public function crearEmpleado(
        array $datos
    ): Usuario {

        return DB::transaction(
            function () use ($datos): Usuario {

                $personal = Personal::create([
                    'dni_personal' => $datos['dni_personal'],
                    'nombre_personal' => trim($datos['nombre_personal']),
                    'apellido_personal' => trim($datos['apellido_personal']),
                    'tel_personal' => $datos['tel_personal'] ?? null,
                ]);

                $usuario = Usuario::create([
                    'rol_usuario' => 'EMPLEADO',
                    'nombre_usuario' => trim($datos['nombre_usuario']),
                    'password' => $datos['dni_personal'],
                    'estado_usuario' => true,
                    'id_personal' => $personal->id_personal,
                ]);

                return $usuario->load('personal');
            }
        );
    }

    /**
     * Activar o desactivar una cuenta de empleado.
     */
    public function cambiarEstado(
        int $idUsuario,
        Usuario $usuarioAutenticado
    ): Usuario {

        $usuario = Usuario::with('personal')
            ->findOrFail($idUsuario);

        if (
            $usuario->id_usuario ===
            $usuarioAutenticado->id_usuario
        ) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'No puedes desactivar tu propia cuenta.',
                ],
            ]);
        }

        if (
            strtoupper($usuario->rol_usuario)
            !== 'EMPLEADO'
        ) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'Desde esta pantalla solo se administran cuentas de empleados.',
                ],
            ]);
        }

        $usuario->estado_usuario =
            !$usuario->estado_usuario;

        $usuario->save();

        if (!$usuario->estado_usuario) {
            $usuario->tokens()->delete();
        }

        return $usuario->fresh('personal');
    }

    /**
     * Restablecer la contrasena de un empleado a su DNI.
     */
    public function restablecerPassword(
        int $idUsuario
    ): Usuario {

        $usuario = Usuario::with('personal')
            ->findOrFail($idUsuario);

        if (
            strtoupper($usuario->rol_usuario)
            !== 'EMPLEADO'
        ) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'Desde esta pantalla solo se restablecen cuentas de empleados.',
                ],
            ]);
        }

        if (!$usuario->personal) {
            throw ValidationException::withMessages([
                'usuario' => [
                    'La cuenta no tiene datos personales asociados.',
                ],
            ]);
        }

        $usuario->password =
            $usuario->personal->dni_personal;

        $usuario->save();

        $usuario->tokens()->delete();

        return $usuario->fresh('personal');
    }

    /**
     * Cambiar la contrasena del usuario autenticado.
     */
    public function cambiarPassword(
        Usuario $usuario,
        string $passwordActual,
        string $nuevoPassword
    ): void {

        if (
            !Hash::check(
                $passwordActual,
                $usuario->password
            )
        ) {
            throw ValidationException::withMessages([
                'password_actual' => [
                    'La contrasena actual es incorrecta.',
                ],
            ]);
        }

        $usuario->password = $nuevoPassword;
        $usuario->save();

        $tokenActual =
            $usuario->currentAccessToken();

        if ($tokenActual) {
            $usuario->tokens()
                ->where(
                    'id',
                    '!=',
                    $tokenActual->id
                )
                ->delete();
        }
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

        $usuario->tokens()->delete();

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
