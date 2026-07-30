<?php

namespace Database\Seeders;

use App\Models\Personal;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class UsuarioSeeder extends Seeder
{
    /**
     * Registrar la cuenta administrativa de la dueña.
     */
    public function run(): void
    {
        $personal = Personal::query()
            ->where('dni_personal', '42849400')
            ->first();

        if (!$personal) {
            throw new RuntimeException(
                'No se encontró el registro personal de la dueña.'
            );
        }

        $usuario = Usuario::query()
            ->firstOrNew([
                'nombre_usuario' => 'JESSICA',
            ]);

        $usuario->rol_usuario = 'ADMINISTRADOR';
        $usuario->estado_usuario = true;
        $usuario->id_personal = $personal->id_personal;

        /*
        |----------------------------------------------------------
        | Contraseña inicial
        |----------------------------------------------------------
        |
        | La contraseña solamente se establece al crear la cuenta.
        | Si posteriormente se cambia, ejecutar nuevamente el
        | seeder no reemplazará la contraseña nueva.
        |
        */
        if (!$usuario->exists) {
            $passwordInicial = env(
                'USUARIO_DUENA_PASSWORD',
                '42849400'
            );

            $usuario->password = Hash::make(
                $passwordInicial
            );
        }

        $usuario->save();
    }
}