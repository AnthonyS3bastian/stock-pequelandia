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
        Schema::create('serie_comprobante', function (Blueprint $table) {

            $table->id('id_serie_comprobante');

            $table->string('tipo_documento_serie', 20);

            $table->string('serie_documento', 10)->unique();

            $table->integer('numero_correlativo')->default(1);

            $table->timestamps();

        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('serie_comprobante');
    }
};