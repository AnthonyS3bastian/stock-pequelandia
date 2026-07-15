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
        Schema::create('usuario', function (Blueprint $table) {

            $table->id('id_usuario');

            $table->string('rol_usuario', 50);

            $table->string('nombre_usuario', 50)->unique();

            $table->string('password');

            $table->boolean('estado_usuario')->default(true);

            $table->foreignId('id_personal')
                  ->constrained('personal', 'id_personal')
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
        Schema::dropIfExists('usuario');
    }
};