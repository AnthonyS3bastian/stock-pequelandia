<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Crear la nueva estructura de códigos de barras
     * y lotes de abastecimiento.
     *
     * También migra los datos actuales sin perderlos.
     */
    public function up(): void
    {
        Schema::create(
            'codigo_barra',
            function (Blueprint $table): void {

                $table->id(
                    'id_codigo_barra'
                );

                $table->string(
                    'codigo_barra',
                    50
                )->unique();

                $table->foreignId(
                    'id_producto'
                )
                    ->constrained(
                        'producto',
                        'id_producto'
                    )
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                $table->boolean(
                    'estado'
                )->default(true);

                $table->timestamps();
            }
        );

        Schema::create(
            'lote_producto',
            function (Blueprint $table): void {

                $table->id(
                    'id_lote_producto'
                );

                $table->foreignId(
                    'id_producto'
                )
                    ->constrained(
                        'producto',
                        'id_producto'
                    )
                    ->cascadeOnUpdate()
                    ->restrictOnDelete();

                $table->unsignedInteger(
                    'cantidad_inicial'
                );

                $table->unsignedInteger(
                    'cantidad_disponible'
                );

                $table->decimal(
                    'costo_unitario',
                    12,
                    2
                );

                $table->date(
                    'fecha_ingreso'
                );

                $table->date(
                    'fecha_caducidad'
                )->nullable();

                $table->boolean(
                    'estado'
                )->default(true);

                $table->timestamps();

                $table->index([
                    'id_producto',
                    'estado',
                ]);

                $table->index(
                    'fecha_caducidad'
                );
            }
        );

        /*
        |--------------------------------------------------------------------------
        | Migrar productos existentes
        |--------------------------------------------------------------------------
        |
        | El codigo_producto actual funciona como código de barras.
        | Lo copiamos a codigo_barra y luego codigo_producto pasa
        | a ser un identificador interno:
        |
        | PROD000001
        | PROD000002
        | ...
        |
        */

        $productos = DB::table(
            'producto'
        )
            ->orderBy(
                'id_producto'
            )
            ->get();

        /*
         * Primero conservamos todos los códigos actuales.
         */
        foreach ($productos as $producto) {

            $codigoAnterior = trim(
                (string) $producto
                    ->codigo_producto
            );

            if ($codigoAnterior !== '') {

                DB::table(
                    'codigo_barra'
                )->insert([
                    'codigo_barra' =>
                        $codigoAnterior,

                    'id_producto' =>
                        $producto
                            ->id_producto,

                    'estado' => true,

                    'created_at' => now(),

                    'updated_at' => now(),
                ]);
            }
        }

        /*
         * Usamos códigos temporales para evitar posibles
         * colisiones con códigos antiguos.
         */
        foreach ($productos as $producto) {

            DB::table(
                'producto'
            )
                ->where(
                    'id_producto',
                    $producto->id_producto
                )
                ->update([
                    'codigo_producto' =>
                        'TMP_PRODUCTO_'
                        . $producto
                            ->id_producto,
                ]);
        }

        /*
         * Asignar código interno definitivo.
         */
        foreach ($productos as $producto) {

            $codigoInterno =
                'PROD'
                . str_pad(
                    (string)
                    $producto->id_producto,
                    6,
                    '0',
                    STR_PAD_LEFT
                );

            DB::table(
                'producto'
            )
                ->where(
                    'id_producto',
                    $producto->id_producto
                )
                ->update([
                    'codigo_producto' =>
                        $codigoInterno,
                ]);

            /*
             * Si el producto ya tenía stock,
             * ese stock se convierte en un lote inicial.
             */
            $stockActual = max(
                0,
                (int)
                $producto->stock_producto
            );

            if ($stockActual <= 0) {
                continue;
            }

            $fechaIngreso =
                $producto->created_at
                    ? substr(
                        (string)
                        $producto->created_at,
                        0,
                        10
                    )
                    : now()
                        ->toDateString();

            DB::table(
                'lote_producto'
            )->insert([
                'id_producto' =>
                    $producto
                        ->id_producto,

                'cantidad_inicial' =>
                    $stockActual,

                'cantidad_disponible' =>
                    $stockActual,

                'costo_unitario' =>
                    $producto
                        ->costo_producto,

                'fecha_ingreso' =>
                    $fechaIngreso,

                'fecha_caducidad' =>
                    $producto
                        ->fecha_caducidad,

                'estado' => true,

                'created_at' => now(),

                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Revertir la migración.
     */
    public function down(): void
    {
        /*
         * Recuperar un código de barras como
         * codigo_producto antes de eliminar
         * la tabla nueva.
         */
        $productos = DB::table(
            'producto'
        )
            ->orderBy(
                'id_producto'
            )
            ->get();

        /*
         * Liberar temporalmente los códigos.
         */
        foreach ($productos as $producto) {

            DB::table(
                'producto'
            )
                ->where(
                    'id_producto',
                    $producto->id_producto
                )
                ->update([
                    'codigo_producto' =>
                        'TMP_ROLLBACK_'
                        . $producto
                            ->id_producto,
                ]);
        }

        foreach ($productos as $producto) {

            $codigoBarra = DB::table(
                'codigo_barra'
            )
                ->where(
                    'id_producto',
                    $producto->id_producto
                )
                ->orderBy(
                    'id_codigo_barra'
                )
                ->value(
                    'codigo_barra'
                );

            $codigoRestaurado =
                $codigoBarra
                ?? (
                    'PROD'
                    . str_pad(
                        (string)
                        $producto->id_producto,
                        6,
                        '0',
                        STR_PAD_LEFT
                    )
                );

            DB::table(
                'producto'
            )
                ->where(
                    'id_producto',
                    $producto->id_producto
                )
                ->update([
                    'codigo_producto' =>
                        $codigoRestaurado,
                ]);
        }

        Schema::dropIfExists(
            'lote_producto'
        );

        Schema::dropIfExists(
            'codigo_barra'
        );
    }
};