<?php

namespace Database\Seeders;

use App\Models\Personal;
use Illuminate\Database\Seeder;

class PersonalSeeder extends Seeder
{
    /**
     * Registrar los datos personales de la dueña.
     */
    public function run(): void
    {
        Personal::updateOrCreate(
            [
                'dni_personal' => '42849400',
            ],
            [
                'nombre_personal' => 'Jessica Jessenia',
                'apellido_personal' => 'Arone Rodriguez',

                /*
                |----------------------------------------------------------
                | Teléfono temporal
                |----------------------------------------------------------
                |
                | Después podrá actualizarse desde el perfil o directamente
                | desde la base de datos.
                |
                */
                'tel_personal' => '000000000',
            ]
        );
    }
}