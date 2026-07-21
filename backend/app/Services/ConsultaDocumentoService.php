<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
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
            config('services.apisperu.url'),
            '/'
        );

        $this->token = config('services.apisperu.token');
    }

    public function consultarDni(string $dni): array
    {
        if (!preg_match('/^\d{8}$/', $dni)) {
            throw ValidationException::withMessages([
                'dni' => [
                    'El DNI debe contener exactamente 8 dígitos.',
                ],
            ]);
        }

        return $this->consultar("{$this->url}/dni/{$dni}");
    }

    public function consultarRuc(string $ruc): array
    {
        if (!preg_match('/^\d{11}$/', $ruc)) {
            throw ValidationException::withMessages([
                'ruc' => [
                    'El RUC debe contener exactamente 11 dígitos.',
                ],
            ]);
        }

        return $this->consultar("{$this->url}/ruc/{$ruc}");
    }

    private function consultar(string $endpoint): array
    {
        if (empty($this->token)) {
            throw new RuntimeException(
                'No se configuró el token de APIsPERU.'
            );
        }

        try {

            $respuesta = Http::timeout(15)
                ->acceptJson()
                ->get($endpoint, [
                    'token' => $this->token,
                ]);

        } catch (ConnectionException $e) {

            throw new RuntimeException(
                'No fue posible conectarse con APIsPERU.'
            );

        }

        if ($respuesta->failed()) {

            throw new RuntimeException(
                'APIsPERU respondió con error HTTP '
                . $respuesta->status()
            );

        }

        return $respuesta->json();
    }
}