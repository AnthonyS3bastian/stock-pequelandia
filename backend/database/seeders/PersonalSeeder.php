<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Personal;

class PersonalSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Personal::create([
            'dni_personal' => '00000000',
            'nombre_personal' => 'Administrador',
            'apellido_personal' => 'Sistema',
            'tel_personal' => '999999999',
        ]);
    }
}