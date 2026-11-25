<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAbastecimientoRequest;
use App\Services\AbastecimientoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Throwable;

class AbastecimientoController extends Controller
{
    public function __construct(
        private readonly AbastecimientoService $abastecimientoService
    ) {
    }

    /**
     * Listar abastecimientos.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'mensaje' =>
                'Abastecimientos obtenidos correctamente.',

            'data' =>
                $this
                    ->abastecimientoService
                    ->listar(),
        ]);
    }

    /**
     * Registrar ingreso de mercaderia.
     */
    public function store(
        StoreAbastecimientoRequest $request
    ): JsonResponse {

        try {

            $lote =
                $this
                    ->abastecimientoService
                    ->registrar(
                        $request
                            ->validated()
                    );

            return response()->json([
                'mensaje' =>
                    'Abastecimiento registrado correctamente.',

                'data' =>
                    $lote,
            ], 201);

        } catch (
            ValidationException $e
        ) {

            $errores =
                $e->errors();

            $primerMensaje =
                'No se pudo registrar el abastecimiento.';

            foreach (
                $errores
                as $mensajes
            ) {

                if (
                    is_array(
                        $mensajes
                    )
                    && isset(
                        $mensajes[0]
                    )
                ) {

                    $primerMensaje =
                        (string)
                        $mensajes[0];

                    break;
                }
            }

            return response()->json([
                'mensaje' =>
                    $primerMensaje,

                'errors' =>
                    $errores,
            ], 422);

        } catch (
            Throwable $e
        ) {

            report(
                $e
            );

            return response()->json([
                'mensaje' =>
                    'Ocurrio un error al registrar el abastecimiento.',
            ], 500);
        }
    }
}