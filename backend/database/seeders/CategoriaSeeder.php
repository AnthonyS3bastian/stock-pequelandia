<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Categoria;

class CategoriaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categorias = [
            'Abarrotes',
            'Bebidas',
            'Lacteos',
            'Limpieza'
        ];

        foreach ($categorias as $categoria) {
            Categoria::create([
                'nombre_categoria' => $categoria,
                'estado' => true,
            ]);
        }
    }
}