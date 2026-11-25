<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'detalle_venta_lote',
            function (Blueprint $table): void {

                $table->id(
                    'id_detalle_venta_lote'
                );

                $table->foreignId(
                    'id_detalle_venta'
                )
                    ->constrained(
                        'detalle_venta',
                        'id_detalle_venta'
                    )
                    ->cascadeOnUpdate()
                    ->cascadeOnDelete();

                $table->foreignId(
                    'id_lote_producto'
                )
                    ->constrained(
                        'lote_producto',
                        'id_lote_producto'
                    )
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                $table->unsignedInteger(
                    'cantidad'
                );

                /*
                 * Se guarda el costo usado
                 * en el momento de la venta.
                 */
                $table->decimal(
                    'costo_unitario',
                    12,
                    2
                );

                $table->timestamps();

                $table->unique(
                    [
                        'id_detalle_venta',
                        'id_lote_producto',
                    ],
                    'detalle_venta_lote_unico'
                );

                $table->index(
                    'id_lote_producto'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'detalle_venta_lote'
        );
    }
};