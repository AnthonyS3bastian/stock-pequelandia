<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Usuario;
use Illuminate\Support\Facades\Hash;

class UsuarioSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Usuario::create([
            'rol_usuario' => 'ADMINISTRADOR',
            'nombre_usuario' => 'admin',
            'password' => Hash::make('admin123'),
            'estado_usuario' => true,
            'id_personal' => 1,
        ]);
    }
}