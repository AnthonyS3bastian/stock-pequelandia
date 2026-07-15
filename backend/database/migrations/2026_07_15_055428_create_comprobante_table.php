<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ejecuta la migración.
     */
    public function up(): void
    {
        Schema::create('comprobante', function (Blueprint $table) {

            $table->id('id_comprobante');

            $table->foreignId('id_serie_comprobante')
                ->constrained('serie_comprobante', 'id_serie_comprobante')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->timestamps();

        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('comprobante');
    }
};