<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ConsultaDocumentoService
{
    private string $url;

    private string $token;

    public function __construct()
    {
        $this->url = rtrim(
            (string) config(
                'services.apisperu.url',
                ''
            ),
            '/'
        );

        $this->token = trim(
            (string) config(
                'services.apisperu.token',
                ''
            )
        );
    }

    /**
     * Consultar información de una persona por DNI.
     */
    public function consultarDni(
        string $dni
    ): array {
        if (
            !preg_match(
                '/^\d{8}$/',
                $dni
            )
        ) {
            throw ValidationException::withMessages([
                'dni' => [
                    'El DNI debe contener exactamente 8 dígitos.',
                ],
            ]);
        }

        return $this->consultar(
            "{$this->url}/dni/{$dni}",
            'dni',
            'DNI'
        );
    }

    /**
     * Consultar información de una empresa por RUC.
     */
    public function consultarRuc(
        string $ruc
    ): array {
        if (
            !preg_match(
                '/^\d{11}$/',
                $ruc
            )
        ) {
            throw ValidationException::withMessages([
                'ruc' => [
                    'El RUC debe contener exactamente 11 dígitos.',
                ],
            ]);
        }

        return $this->consultar(
            "{$this->url}/ruc/{$ruc}",
            'ruc',
            'RUC'
        );
    }

    /**
     * Realizar la consulta al proveedor externo.
     */
    private function consultar(
        string $endpoint,
        string $campo,
        string $tipoDocumento
    ): array {
        $this->validarConfiguracion();

        try {
            $respuesta = Http::connectTimeout(3)
                ->timeout(10)
                ->acceptJson()
                ->get(
                    $endpoint,
                    [
                        'token' =>
                            $this->token,
                    ]
                );
        } catch (ConnectionException $e) {
            throw new RuntimeException(
                'El servicio de consulta de documentos no está disponible. Intente nuevamente.'
            );
        }

        $this->validarRespuestaHttp(
            $respuesta,
            $campo,
            $tipoDocumento
        );

        $datos = $respuesta->json();

        if (!is_array($datos)) {
            throw new RuntimeException(
                'El servicio de consulta devolvió una respuesta inválida.'
            );
        }

        if (
            isset($datos['success'])
            && $datos['success'] === false
        ) {
            $mensaje = trim(
                (string) (
                    $datos['message']
                    ?? $datos['mensaje']
                    ?? ''
                )
            );

            throw ValidationException::withMessages([
                $campo => [
                    $mensaje !== ''
                        ? $mensaje
                        : "No se encontró información para el {$tipoDocumento} ingresado.",
                ],
            ]);
        }

        return $datos;
    }

    /**
     * Validar la configuración de APIsPERU.
     */
    private function validarConfiguracion(): void
    {
        if ($this->url === '') {
            throw new RuntimeException(
                'No se configuró la URL de APIsPERU.'
            );
        }

        if ($this->token === '') {
            throw new RuntimeException(
                'No se configuró el token de APIsPERU.'
            );
        }
    }

    /**
     * Clasificar los errores HTTP del proveedor.
     */
    private function validarRespuestaHttp(
        Response $respuesta,
        string $campo,
        string $tipoDocumento
    ): void {
        if ($respuesta->successful()) {
            return;
        }

        $estadoHttp =
            $respuesta->status();

        $mensajeProveedor = trim(
            (string) (
                $respuesta->json('message')
                ?? $respuesta->json('mensaje')
                ?? ''
            )
        );

        if ($estadoHttp === 404) {
            throw ValidationException::withMessages([
                $campo => [
                    "No se encontró información para el {$tipoDocumento} ingresado.",
                ],
            ]);
        }

        if (
            $estadoHttp === 400
            || $estadoHttp === 422
        ) {
            throw ValidationException::withMessages([
                $campo => [
                    $mensajeProveedor !== ''
                        ? $mensajeProveedor
                        : "El {$tipoDocumento} ingresado no es válido.",
                ],
            ]);
        }

        if (
            $estadoHttp === 401
            || $estadoHttp === 403
        ) {
            throw new RuntimeException(
                'No fue posible autenticar la consulta con APIsPERU.'
            );
        }

        if ($estadoHttp >= 500) {
            throw new RuntimeException(
                'El servicio de consulta de documentos presenta una falla temporal.'
            );
        }

        throw new RuntimeException(
            "El servicio de consulta respondió con el código HTTP {$estadoHttp}."
        );
    }
}