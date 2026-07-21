<?php

namespace App\Http\Controllers;

use App\Services\ConsultaDocumentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

class ConsultaDocumentoController extends Controller
{
    public function __construct(
        private ConsultaDocumentoService $consultaDocumentoService
    ) {
    }

    /**
     * Consulta los datos de una persona mediante DNI.
     */
    public function consultarDni(string $dni): JsonResponse
    {
        try {
            $datos = $this->consultaDocumentoService
                ->consultarDni($dni);

            return response()->json([
                'mensaje' => 'DNI consultado correctamente.',
                'datos' => $datos,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (RuntimeException $e) {
            return response()->json([
                'mensaje' => $e->getMessage(),
            ], 502);
        } catch (Throwable $e) {
            return response()->json([
                'mensaje' =>
                    'Ocurrió un error inesperado al consultar el DNI.',
            ], 500);
        }
    }

    /**
     * Consulta los datos de una empresa mediante RUC.
     */
    public function consultarRuc(string $ruc): JsonResponse
    {
        try {
            $datos = $this->consultaDocumentoService
                ->consultarRuc($ruc);

            return response()->json([
                'mensaje' => 'RUC consultado correctamente.',
                'datos' => $datos,
            ]);
        } catch (ValidationException $e) {
            throw $e;
        } catch (RuntimeException $e) {
            return response()->json([
                'mensaje' => $e->getMessage(),
            ], 502);
        } catch (Throwable $e) {
            return response()->json([
                'mensaje' =>
                    'Ocurrió un error inesperado al consultar el RUC.',
            ], 500);
        }
    }
}