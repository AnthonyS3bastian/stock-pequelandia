<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ConsultaDocumentoController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\VentaController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Autenticacion publica
|--------------------------------------------------------------------------
*/

Route::post(
    '/login',
    [AuthController::class, 'login']
);

/*
|--------------------------------------------------------------------------
| Rutas protegidas con Laravel Sanctum
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')
    ->group(function (): void {

        /*
        |--------------------------------------------------------------------------
        | Autenticacion y perfil
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/logout',
            [AuthController::class, 'logout']
        );

        Route::get(
            '/perfil',
            [AuthController::class, 'perfil']
        );

        /*
        |--------------------------------------------------------------------------
        | Consultas DNI y RUC
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/consultas/dni/{dni}',
            [
                ConsultaDocumentoController::class,
                'consultarDni',
            ]
        );

        Route::get(
            '/consultas/ruc/{ruc}',
            [
                ConsultaDocumentoController::class,
                'consultarRuc',
            ]
        );

        /*
        |--------------------------------------------------------------------------
        | Categorias: consulta
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/categorias',
            [CategoriaController::class, 'index']
        );

        Route::get(
            '/categorias/{id}',
            [CategoriaController::class, 'show']
        );

        /*
        |--------------------------------------------------------------------------
        | Productos: consulta
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/productos',
            [ProductoController::class, 'index']
        );

        /*
         * Esta ruta debe permanecer antes de /productos/{id}.
         */
        Route::get(
            '/productos/codigo/{codigo}',
            [
                ProductoController::class,
                'buscarPorCodigo',
            ]
        );

        Route::get(
            '/productos/{id}',
            [ProductoController::class, 'show']
        );

        /*
        |--------------------------------------------------------------------------
        | Ventas
        |--------------------------------------------------------------------------
        */

        Route::post(
            '/ventas',
            [VentaController::class, 'registrar']
        );

        /*
        |--------------------------------------------------------------------------
        | Rutas exclusivas del administrador
        |--------------------------------------------------------------------------
        */

        Route::middleware('administrador')
            ->group(function (): void {

                /*
                |--------------------------------------------------------------------------
                | Gestion de categorias
                |--------------------------------------------------------------------------
                */

                Route::post(
                    '/categorias',
                    [
                        CategoriaController::class,
                        'store',
                    ]
                );

                Route::put(
                    '/categorias/{id}',
                    [
                        CategoriaController::class,
                        'update',
                    ]
                );

                Route::delete(
                    '/categorias/{id}',
                    [
                        CategoriaController::class,
                        'destroy',
                    ]
                );

                /*
                |--------------------------------------------------------------------------
                | Gestion de productos
                |--------------------------------------------------------------------------
                */

                Route::post(
                    '/productos',
                    [
                        ProductoController::class,
                        'store',
                    ]
                );

                Route::put(
                    '/productos/{id}',
                    [
                        ProductoController::class,
                        'update',
                    ]
                );

                Route::delete(
                    '/productos/{id}',
                    [
                        ProductoController::class,
                        'destroy',
                    ]
                );

                /*
                |--------------------------------------------------------------------------
                | Reportes
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/reportes/diario',
                    [
                        ReporteController::class,
                        'diario',
                    ]
                );

                Route::get(
                    '/reportes/semanal',
                    [
                        ReporteController::class,
                        'semanal',
                    ]
                );

                Route::get(
                    '/reportes/mensual',
                    [
                        ReporteController::class,
                        'mensual',
                    ]
                );

            });

    });