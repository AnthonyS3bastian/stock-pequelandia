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
        Schema::create('detalle_venta', function (Blueprint $table) {

            $table->id('id_detalle_venta');

            $table->decimal('precio_publico_venta',12,2);

            $table->decimal('costo_detalle_venta',12,2);

            $table->integer('cantidad_detalle_venta');

            $table->foreignId('id_producto')
                ->constrained('producto','id_producto')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('id_venta')
                ->constrained('venta','id_venta')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();

            $table->timestamps();

        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('detalle_venta');
    }
};