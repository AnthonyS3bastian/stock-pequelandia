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
        Schema::create('producto', function (Blueprint $table) {

            $table->id('id_producto');

            $table->string('codigo_producto', 50)->unique();

            $table->string('nombre_producto', 150);

            $table->text('descripcion_producto')->nullable();

            $table->foreignId('id_categoria')
                  ->constrained('categoria', 'id_categoria')
                  ->cascadeOnUpdate()
                  ->restrictOnDelete();

            $table->decimal('precio_producto', 12, 2);

            $table->decimal('costo_producto', 12, 2);

            $table->date('fecha_caducidad')->nullable();

            $table->integer('stock_producto')->default(0);

            $table->boolean('estado')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('producto');
    }
};