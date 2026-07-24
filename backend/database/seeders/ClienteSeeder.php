<?php

namespace Database\Seeders;

use App\Models\Cliente;
use Illuminate\Database\Seeder;

class ClienteSeeder extends Seeder
{
    /**
     * Registrar el cliente utilizado
     * en las ventas rápidas.
     */
    public function run(): void
    {
        Cliente::updateOrCreate(
            [
                'codigo_cliente' =>
                    '00000000',
            ],
            [
                'tipo_cliente' =>
                    'Natural',

                'nombres_cliente' =>
                    'PUBLICO GENERAL',

                'apellidos_cliente' =>
                    null,

                'razon_social_cliente' =>
                    null,

                'telefono_cliente' =>
                    null,

                'direccion_cliente' =>
                    null,

                'correo_cliente' =>
                    null,

                'estado' =>
                    true,
            ]
        );
    }
}