<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'personal',
            function (
                Blueprint $table
            ): void {

                $table
                    ->string(
                        'tel_personal',
                        15
                    )
                    ->nullable()
                    ->change();
            }
        );
    }

    public function down(): void
    {
        /*
         * No se fuerza nuevamente NOT NULL
         * porque podrían existir vendedores
         * legítimamente registrados sin teléfono.
         */
    }
};