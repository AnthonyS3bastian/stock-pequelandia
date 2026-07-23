<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agrega el stock minimo configurable para cada producto.
     */
    public function up(): void
    {
        Schema::table('producto', function (Blueprint $table) {
            $table
                ->unsignedInteger('stock_minimo_producto')
                ->default(0)
                ->after('stock_producto');
        });
    }

    /**
     * Revierte el cambio eliminando el campo agregado.
     */
    public function down(): void
    {
        Schema::table('producto', function (Blueprint $table) {
            $table->dropColumn('stock_minimo_producto');
        });
    }
};