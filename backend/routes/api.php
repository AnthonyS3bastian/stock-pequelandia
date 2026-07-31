<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoriaController;
use App\Http\Controllers\ConsultaDocumentoController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ProductoController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\UsuarioController;
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

        Route::put(
            '/perfil/password',
            [AuthController::class, 'cambiarPassword']
        );

        /*
        |--------------------------------------------------------------------------
        | Dashboard
        |--------------------------------------------------------------------------
        */

        Route::get(
            '/dashboard',
            [DashboardController::class, 'index']
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

        Route::get(
            '/productos/buscar',
            [ProductoController::class, 'buscar']
        );

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

        Route::get(
            '/ventas/comprobante/{numeroComprobante}',
            [
                VentaController::class,
                'buscarPorComprobante',
            ]
        );

        Route::patch(
            '/ventas/comprobante/{numeroComprobante}/anular',
            [VentaController::class, 'anular']
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
                | Gestion de usuarios
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/usuarios',
                    [UsuarioController::class, 'index']
                );

                Route::post(
                    '/usuarios',
                    [UsuarioController::class, 'store']
                );

                Route::patch(
                    '/usuarios/{id}/estado',
                    [UsuarioController::class, 'cambiarEstado']
                );

                Route::patch(
                    '/usuarios/{id}/restablecer-password',
                    [UsuarioController::class, 'restablecerPassword']
                );

                /*
                |--------------------------------------------------------------------------
                | Gestion de categorias
                |--------------------------------------------------------------------------
                */

                Route::post(
                    '/categorias',
                    [CategoriaController::class, 'store']
                );

                Route::put(
                    '/categorias/{id}',
                    [CategoriaController::class, 'update']
                );

                Route::delete(
                    '/categorias/{id}',
                    [CategoriaController::class, 'destroy']
                );

                /*
                |--------------------------------------------------------------------------
                | Gestion de productos
                |--------------------------------------------------------------------------
                */

                Route::post(
                    '/productos',
                    [ProductoController::class, 'store']
                );

                Route::patch(
                    '/productos/{id}/stock',
                    [ProductoController::class, 'actualizarStock']
                );

                Route::patch(
                    '/productos/{id}/estado',
                    [ProductoController::class, 'cambiarEstado']
                );

                Route::put(
                    '/productos/{id}',
                    [ProductoController::class, 'update']
                );

                Route::delete(
                    '/productos/{id}',
                    [ProductoController::class, 'destroy']
                );

                /*
                |--------------------------------------------------------------------------
                | Reportes
                |--------------------------------------------------------------------------
                */

                Route::get(
                    '/reportes/inventario',
                    [ReporteController::class, 'inventario']
                );

                Route::get(
                    '/reportes/diario',
                    [ReporteController::class, 'diario']
                );

                Route::get(
                    '/reportes/semanal',
                    [ReporteController::class, 'semanal']
                );

                Route::get(
                    '/reportes/mensual',
                    [ReporteController::class, 'mensual']
                );
            });
    });