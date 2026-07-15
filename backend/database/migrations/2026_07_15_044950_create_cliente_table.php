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
        Schema::create('cliente', function (Blueprint $table) {

            $table->id('id_cliente');

            $table->enum('tipo_cliente', ['Natural', 'Empresa']);

            $table->string('codigo_cliente', 11)->unique();

            $table->string('nombres_cliente', 100)->nullable();

            $table->string('apellidos_cliente', 100)->nullable();

            $table->string('razon_social_cliente', 150)->nullable();

            $table->string('telefono_cliente', 20)->nullable();

            $table->string('direccion_cliente', 150)->nullable();

            $table->string('correo_cliente', 100)->nullable();

            $table->boolean('estado')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('cliente');
    }
};