<?php

namespace Database\Seeders;

use App\Models\SerieComprobante;
use Illuminate\Database\Seeder;

class SerieComprobanteSeeder extends Seeder
{
    /**
     * Registrar las series iniciales.
     */
    public function run(): void
    {
        SerieComprobante::updateOrCreate(
            [
                'tipo_documento_serie' => 'VENTA RAPIDA',
            ],
            [
                'serie_documento' => 'NV001',
                'numero_correlativo' => 1,
            ]
        );

        SerieComprobante::updateOrCreate(
            [
                'tipo_documento_serie' => 'BOLETA',
            ],
            [
                'serie_documento' => 'B001',
                'numero_correlativo' => 1,
            ]
        );

        SerieComprobante::updateOrCreate(
            [
                'tipo_documento_serie' => 'FACTURA',
            ],
            [
                'serie_documento' => 'F001',
                'numero_correlativo' => 1,
            ]
        );
    }
}