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
| Autenticacion
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Rutas publicas
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Consultas DNI y RUC
|--------------------------------------------------------------------------
*/

Route::get(
    '/consultas/dni/{dni}',
    [ConsultaDocumentoController::class, 'consultarDni']
);

Route::get(
    '/consultas/ruc/{ruc}',
    [ConsultaDocumentoController::class, 'consultarRuc']
);

/*
|--------------------------------------------------------------------------
| Categorias
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
| Productos
|--------------------------------------------------------------------------
*/

Route::get(
    '/productos',
    [ProductoController::class, 'index']
);

/*
 * Esta ruta debe ir antes de /productos/{id},
 * porque "codigo" podria interpretarse como un ID.
 */
Route::get(
    '/productos/codigo/{codigo}',
    [ProductoController::class, 'buscarPorCodigo']
);

Route::get(
    '/productos/{id}',
    [ProductoController::class, 'show']
);

Route::post(
    '/productos',
    [ProductoController::class, 'store']
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
| Rutas protegidas con Laravel Sanctum
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function (): void {

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
    | Reportes
    |--------------------------------------------------------------------------
    */

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