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
        Schema::create('categoria', function (Blueprint $table) {

            $table->id('id_categoria');

            $table->string('nombre_categoria', 100)->unique();

            $table->string('descripcion_categoria', 255)->nullable();

            $table->boolean('estado')->default(true);

            $table->timestamps();
        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('categoria');
    }
};