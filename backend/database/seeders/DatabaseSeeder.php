<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Ejecutar los datos iniciales del sistema.
     */
    public function run(): void
    {
        $this->call([
            PersonalSeeder::class,
            UsuarioSeeder::class,
            CategoriaSeeder::class,
            ClienteSeeder::class,
            SerieComprobanteSeeder::class,
        ]);
    }
}