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

    public function obtenerPerfil(
        Usuario $usuario
    ): Usuario {

        return $usuario
            ->load(
                'personal'
            );
    }

    public function listarUsuarios():
        Collection {

        return Usuario::query()
            ->with(
                'personal'
            )
            ->orderByRaw(
                "CASE WHEN rol_usuario = 'ADMINISTRADOR' THEN 0 ELSE 1 END"
            )
            ->orderBy(
                'nombre_usuario'
            )
            ->get();
    }

    /**
     * Internamente se conserva EMPLEADO
     * para no romper datos existentes.
     *
     * Visualmente el sistema lo presenta
     * como Vendedor.
     */
    public function crearEmpleado(
        array $datos
    ): Usuario {

        return DB::transaction(
            function () use (
                $datos
            ): Usuario {

                $personal =
                    Personal::create([
                        'dni_personal' =>
                            $datos[
                                'dni_personal'
                            ],

                        'nombre_personal' =>
                            trim(
                                $datos[
                                    'nombre_personal'
                                ]
                            ),

                        'apellido_personal' =>
                            trim(
                                $datos[
                                    'apellido_personal'
                                ]
                            ),

                        'tel_personal' =>
                            $datos[
                                'tel_personal'
                            ]
                            ?? null,
                    ]);

                $usuario =
                    Usuario::create([
                        'rol_usuario' =>
                            'EMPLEADO',

                        'nombre_usuario' =>
                            trim(
                                $datos[
                                    'nombre_usuario'
                                ]
                            ),

                        'password' =>
                            $datos[
                                'dni_personal'
                            ],

                        'estado_usuario' =>
                            true,

                        'id_personal' =>
                            $personal
                                ->id_personal,
                    ]);

                return $usuario
                    ->load(
                        'personal'
                    );
            }
        );
    }

    public function cambiarEstado(
        int $idUsuario,
        Usuario $usuarioAutenticado
    ): Usuario {

        $usuario =
            Usuario::with(
                'personal'
            )
                ->findOrFail(
                    $idUsuario
                );

        if (
            $usuario->id_usuario
            ===
            $usuarioAutenticado
                ->id_usuario
        ) {

            throw ValidationException
                ::withMessages([
                    'usuario' => [
                        'No puedes desactivar tu propia cuenta.',
                    ],
                ]);
        }

        if (
            strtoupper(
                $usuario->rol_usuario
            )
            !== 'EMPLEADO'
        ) {

            throw ValidationException
                ::withMessages([
                    'usuario' => [
                        'Desde esta pantalla solo se administran cuentas de vendedores.',
                    ],
                ]);
        }

        $usuario->estado_usuario =
            !$usuario
                ->estado_usuario;

        $usuario->save();

        if (
            !$usuario->estado_usuario
        ) {

            $usuario
                ->tokens()
                ->delete();
        }

        return $usuario
            ->fresh(
                'personal'
            );
    }

    public function restablecerPassword(
        int $idUsuario
    ): Usuario {

        $usuario =
            Usuario::with(
                'personal'
            )
                ->findOrFail(
                    $idUsuario
                );

        if (
            strtoupper(
                $usuario->rol_usuario
            )
            !== 'EMPLEADO'
        ) {

            throw ValidationException
                ::withMessages([
                    'usuario' => [
                        'Desde esta pantalla solo se restablecen cuentas de vendedores.',
                    ],
                ]);
        }

        if (
            !$usuario->personal
        ) {

            throw ValidationException
                ::withMessages([
                    'usuario' => [
                        'La cuenta no tiene datos personales asociados.',
                    ],
                ]);
        }

        $usuario->password =
            $usuario
                ->personal
                ->dni_personal;

        $usuario->save();

        $usuario
            ->tokens()
            ->delete();

        return $usuario
            ->fresh(
                'personal'
            );
    }

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

            throw ValidationException
                ::withMessages([
                    'password_actual' => [
                        'La contraseña actual es incorrecta.',
                    ],
                ]);
        }

        $usuario->password =
            $nuevoPassword;

        $usuario->save();

        $tokenActual =
            $usuario
                ->currentAccessToken();

        if (
            $tokenActual
        ) {

            $usuario
                ->tokens()
                ->where(
                    'id',
                    '!=',
                    $tokenActual->id
                )
                ->delete();
        }
    }

    public function login(
        string $nombreUsuario,
        string $password
    ): array {

        $usuario =
            $this->buscarPorNombre(
                $nombreUsuario
            );

        if (
            !$usuario
            ||
            !Hash::check(
                $password,
                $usuario->password
            )
        ) {

            throw ValidationException
                ::withMessages([
                    'credenciales' => [
                        'Usuario o contraseña incorrectos.',
                    ],
                ]);
        }

        if (
            !$usuario->estado_usuario
        ) {

            throw ValidationException
                ::withMessages([
                    'credenciales' => [
                        'La cuenta se encuentra inactiva. Comuníquese con la administradora.',
                    ],
                ]);
        }

        $usuario
            ->tokens()
            ->delete();

        $token =
            $usuario
                ->createToken(
                    'auth_token'
                )
                ->plainTextToken;

        return [
            'usuario' =>
                $usuario,

            'token' =>
                $token,
        ];
    }

    public function logout(
        Usuario $usuario
    ): void {

        $tokenActual =
            $usuario
                ->currentAccessToken();

        if (
            $tokenActual
        ) {

            $tokenActual
                ->delete();
        }
    }
}