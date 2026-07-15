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
        Schema::create('personal', function (Blueprint $table) {
            $table->id('id_personal');
            $table->string('dni_personal', 8)->unique();
            $table->string('nombre_personal', 100);
            $table->string('apellido_personal', 100);
            $table->string('tel_personal', 15);
            $table->timestamps();
        });
    }

    /**
     * Revierte la migración.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal');
    }
};