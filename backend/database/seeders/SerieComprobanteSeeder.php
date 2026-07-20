<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SerieComprobante;

class SerieComprobanteSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        SerieComprobante::create([
            'tipo_documento_serie' => 'VENTA RAPIDA',
            'serie_documento' => 'NV001',
            'numero_correlativo' => 1,
        ]);

        SerieComprobante::create([
            'tipo_documento_serie' => 'BOLETA',
            'serie_documento' => 'B001',
            'numero_correlativo' => 1,
        ]);

        SerieComprobante::create([
            'tipo_documento_serie' => 'FACTURA',
            'serie_documento' => 'F001',
            'numero_correlativo' => 1,
        ]);
    }
}