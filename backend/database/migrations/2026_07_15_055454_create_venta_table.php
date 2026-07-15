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
        Schema::create('venta', function (Blueprint $table) {

            $table->id('id_venta');

            $table->dateTime('fecha_venta');

            $table->string('numero_comprobante',20);

            $table->decimal('total_venta',12,2);

            $table->foreignId('id_usuario')
                ->constrained('usuario','id_usuario')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_serie_comprobante')
                ->constrained('serie_comprobante','id_serie_comprobante')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_cliente')
                ->constrained('cliente','id_cliente')
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
        Schema::dropIfExists('venta');
    }
};