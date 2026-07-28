<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Agregar los campos necesarios para controlar
     * la anulación de ventas sin eliminar información.
     */
    public function up(): void
    {
        Schema::table(
            'venta',
            function (Blueprint $table): void {
                $table->string(
                    'estado_venta',
                    15
                )
                    ->default('REGISTRADA')
                    ->after('total_venta')
                    ->index();

                $table->dateTime(
                    'fecha_anulacion'
                )
                    ->nullable()
                    ->after('fecha_venta')
                    ->index();

                $table->unsignedBigInteger(
                    'id_usuario_anulacion'
                )
                    ->nullable()
                    ->after('id_usuario');

                $table->foreign(
                    'id_usuario_anulacion',
                    'venta_usuario_anulacion_fk'
                )
                    ->references('id_usuario')
                    ->on('usuario')
                    ->nullOnDelete();
            }
        );
    }

    /**
     * Revertir los campos agregados.
     */
    public function down(): void
    {
        Schema::table(
            'venta',
            function (Blueprint $table): void {
                $table->dropForeign(
                    'venta_usuario_anulacion_fk'
                );

                $table->dropColumn([
                    'estado_venta',
                    'fecha_anulacion',
                    'id_usuario_anulacion',
                ]);
            }
        );
    }
};