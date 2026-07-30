<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    /**
     * Registrar las categorías iniciales del negocio.
     */
    public function run(): void
    {
        $categorias = [
            'Librería',
            'Juguetería',
            'Joyería',
            'Perfumería',
            'Peluches',
            'Regalos',
            'Ropa',
            'Cargadores y audífonos',
            'Bolsas y papel de regalo',
            'Plastiquería',
            'Ferretería',
            'Pasamanería',
            'Ganchos',
            'Accesorios deportivos',
            'Piñatería',
            'Licorería',
            'Golosinas',
            'Accesorios de limpieza',
            'Accesorios temporada',
        ];

        foreach ($categorias as $nombreCategoria) {
            Categoria::updateOrCreate(
                [
                    'nombre_categoria' => $nombreCategoria,
                ],
                [
                    'estado' => true,
                ]
            );
        }
    }
}