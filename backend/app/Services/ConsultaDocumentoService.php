<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class ConsultaDocumentoService
{
    private string $apisPeruUrl;

    private string $apisPeruToken;

    private string $apiPeruDevUrl;

    private string $apiPeruDevToken;

    public function __construct()
    {
        $this->apisPeruUrl =
            rtrim(
                (string) config(
                    'services.apisperu.url',
                    ''
                ),
                '/'
            );

        $this->apisPeruToken =
            trim(
                (string) config(
                    'services.apisperu.token',
                    ''
                )
            );

        $this->apiPeruDevUrl =
            rtrim(
                (string) config(
                    'services.apiperudev.url',
                    ''
                ),
                '/'
            );

        $this->apiPeruDevToken =
            trim(
                (string) config(
                    'services.apiperudev.token',
                    ''
                )
            );
    }

    /**
     * Consultar información de una persona por DNI.
     *
     * Primero utiliza APIsPERU.
     * Si no encuentra resultados o presenta una falla,
     * consulta automáticamente ApiPeruDev.
     */
    public function consultarDni(
        string $dni
    ): array {
        $this->validarDni(
            $dni
        );

        $errorApisPeru =
            null;

        try {
            return $this
                ->consultarDniApisPeru(
                    $dni
                );
        } catch (
            ValidationException
            | RuntimeException $e
        ) {
            $errorApisPeru =
                $e;
        }

        try {
            return $this
                ->consultarDniApiPeruDev(
                    $dni
                );
        } catch (
            ValidationException $e
        ) {
            /*
             * Si ambos proveedores indican que
             * no tienen información, devolvemos
             * un único mensaje comprensible.
             */
            if (
                $errorApisPeru
                instanceof ValidationException
            ) {
                throw ValidationException
                    ::withMessages([
                        'dni' => [
                            'No se encontraron resultados en los servicios disponibles.',
                        ],
                    ]);
            }

            throw $e;
        } catch (
            RuntimeException $e
        ) {
            /*
             * Si ambos proveedores presentan
             * errores técnicos, se informa que
             * ninguno está disponible.
             */
            if (
                $errorApisPeru
                instanceof RuntimeException
            ) {
                throw new RuntimeException(
                    'Los servicios de consulta de DNI no están disponibles. Intente nuevamente.'
                );
            }

            throw $e;
        }
    }

    /**
     * Consultar información de una empresa por RUC.
     *
     * La consulta de RUC continúa utilizando
     * APIsPERU porque ya funciona correctamente.
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
            throw ValidationException
                ::withMessages([
                    'ruc' => [
                        'El RUC debe contener exactamente 11 dígitos.',
                    ],
                ]);
        }

        return $this
            ->consultarApisPeru(
                "{$this->apisPeruUrl}/ruc/{$ruc}",
                'ruc',
                'RUC'
            );
    }

    /**
     * Consultar DNI mediante APIsPERU.
     */
    private function consultarDniApisPeru(
        string $dni
    ): array {
        $datos =
            $this->consultarApisPeru(
                "{$this->apisPeruUrl}/dni/{$dni}",
                'dni',
                'DNI'
            );

        return $this
            ->normalizarDatosDni(
                $datos,
                $dni,
                'APISPERU'
            );
    }

    /**
     * Consultar DNI mediante ApiPeruDev.
     */
    private function consultarDniApiPeruDev(
        string $dni
    ): array {
        $this
            ->validarConfiguracionApiPeruDev();

        try {
            $respuesta =
                Http::connectTimeout(3)
                    ->timeout(10)
                    ->acceptJson()
                    ->asJson()
                    ->withToken(
                        $this->apiPeruDevToken
                    )
                    ->post(
                        "{$this->apiPeruDevUrl}/dni",
                        [
                            'dni' =>
                                $dni,
                        ]
                    );
        } catch (
            ConnectionException $e
        ) {
            throw new RuntimeException(
                'El servicio alternativo de consulta de DNI no está disponible.'
            );
        }

        $this->validarRespuestaHttp(
            $respuesta,
            'dni',
            'DNI',
            'ApiPeruDev'
        );

        $respuestaJson =
            $respuesta->json();

        if (
            !is_array(
                $respuestaJson
            )
        ) {
            throw new RuntimeException(
                'El servicio alternativo devolvió una respuesta inválida.'
            );
        }

        if (
            isset(
                $respuestaJson[
                    'success'
                ]
            )
            && $respuestaJson[
                'success'
            ] === false
        ) {
            $mensaje =
                $this->obtenerMensajeProveedor(
                    $respuestaJson
                );

            throw ValidationException
                ::withMessages([
                    'dni' => [
                        $mensaje !== ''
                            ? $mensaje
                            : 'No se encontraron resultados.',
                    ],
                ]);
        }

        $datos =
            $respuestaJson['data']
            ?? null;

        if (
            !is_array(
                $datos
            )
        ) {
            throw ValidationException
                ::withMessages([
                    'dni' => [
                        'No se encontraron resultados.',
                    ],
                ]);
        }

        return $this
            ->normalizarDatosDni(
                $datos,
                $dni,
                'APIPERUDEV'
            );
    }

    /**
     * Realizar una consulta mediante APIsPERU.
     */
    private function consultarApisPeru(
        string $endpoint,
        string $campo,
        string $tipoDocumento
    ): array {
        $this
            ->validarConfiguracionApisPeru();

        try {
            $respuesta =
                Http::connectTimeout(3)
                    ->timeout(10)
                    ->acceptJson()
                    ->get(
                        $endpoint,
                        [
                            'token' =>
                                $this->apisPeruToken,
                        ]
                    );
        } catch (
            ConnectionException $e
        ) {
            throw new RuntimeException(
                'APIsPERU no está disponible. Intente nuevamente.'
            );
        }

        $this->validarRespuestaHttp(
            $respuesta,
            $campo,
            $tipoDocumento,
            'APIsPERU'
        );

        $datos =
            $respuesta->json();

        if (
            !is_array(
                $datos
            )
        ) {
            throw new RuntimeException(
                'APIsPERU devolvió una respuesta inválida.'
            );
        }

        if (
            isset(
                $datos['success']
            )
            && $datos['success']
                === false
        ) {
            $mensaje =
                $this->obtenerMensajeProveedor(
                    $datos
                );

            throw ValidationException
                ::withMessages([
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
     * Normalizar las respuestas de ambos
     * proveedores para que Angular reciba
     * siempre los mismos nombres de campos.
     */
    private function normalizarDatosDni(
        array $datos,
        string $dni,
        string $fuente
    ): array {
        /*
         * Algunos proveedores colocan los
         * resultados dentro de "data".
         */
        if (
            isset($datos['data'])
            && is_array(
                $datos['data']
            )
        ) {
            $datos =
                $datos['data'];
        }

        $nombres =
            trim(
                (string) (
                    $datos['nombres']
                    ?? ''
                )
            );

        $apellidoPaterno =
            trim(
                (string) (
                    $datos[
                        'apellidoPaterno'
                    ]
                    ?? $datos[
                        'apellido_paterno'
                    ]
                    ?? ''
                )
            );

        $apellidoMaterno =
            trim(
                (string) (
                    $datos[
                        'apellidoMaterno'
                    ]
                    ?? $datos[
                        'apellido_materno'
                    ]
                    ?? ''
                )
            );

        $nombreCompleto =
            trim(
                (string) (
                    $datos[
                        'nombreCompleto'
                    ]
                    ?? $datos[
                        'nombre_completo'
                    ]
                    ?? ''
                )
            );

        if (
            $nombreCompleto === ''
        ) {
            $nombreCompleto =
                trim(
                    implode(
                        ' ',
                        array_filter([
                            $nombres,
                            $apellidoPaterno,
                            $apellidoMaterno,
                        ])
                    )
                );
        }

        if (
            $nombres === ''
            && $apellidoPaterno === ''
            && $apellidoMaterno === ''
            && $nombreCompleto === ''
        ) {
            throw ValidationException
                ::withMessages([
                    'dni' => [
                        'No se encontraron resultados.',
                    ],
                ]);
        }

        return [
            'dni' =>
                $dni,

            'numero' =>
                (string) (
                    $datos['numero']
                    ?? $dni
                ),

            'nombres' =>
                $nombres,

            'apellidoPaterno' =>
                $apellidoPaterno,

            'apellidoMaterno' =>
                $apellidoMaterno,

            'nombreCompleto' =>
                $nombreCompleto,

            'codigoVerificacion' =>
                (string) (
                    $datos[
                        'codigo_verificacion'
                    ]
                    ?? $datos[
                        'codigoVerificacion'
                    ]
                    ?? ''
                ),

            'fuente' =>
                $fuente,
        ];
    }

    /**
     * Validar formato del DNI.
     */
    private function validarDni(
        string $dni
    ): void {
        if (
            !preg_match(
                '/^\d{8}$/',
                $dni
            )
        ) {
            throw ValidationException
                ::withMessages([
                    'dni' => [
                        'El DNI debe contener exactamente 8 dígitos.',
                    ],
                ]);
        }
    }

    /**
     * Validar configuración de APIsPERU.
     */
    private function validarConfiguracionApisPeru():
        void {
        if (
            $this->apisPeruUrl === ''
        ) {
            throw new RuntimeException(
                'No se configuró la URL de APIsPERU.'
            );
        }

        if (
            $this->apisPeruToken === ''
        ) {
            throw new RuntimeException(
                'No se configuró el token de APIsPERU.'
            );
        }
    }

    /**
     * Validar configuración de ApiPeruDev.
     */
    private function validarConfiguracionApiPeruDev():
        void {
        if (
            $this->apiPeruDevUrl === ''
        ) {
            throw new RuntimeException(
                'No se configuró la URL de ApiPeruDev.'
            );
        }

        if (
            $this->apiPeruDevToken === ''
        ) {
            throw new RuntimeException(
                'No se configuró el token de ApiPeruDev.'
            );
        }
    }

    /**
     * Clasificar errores HTTP.
     */
    private function validarRespuestaHttp(
        Response $respuesta,
        string $campo,
        string $tipoDocumento,
        string $proveedor
    ): void {
        if (
            $respuesta->successful()
        ) {
            return;
        }

        $estadoHttp =
            $respuesta->status();

        $respuestaJson =
            $respuesta->json();

        $mensajeProveedor =
            is_array(
                $respuestaJson
            )
                ? $this
                    ->obtenerMensajeProveedor(
                        $respuestaJson
                    )
                : '';

        if (
            $estadoHttp === 404
        ) {
            throw ValidationException
                ::withMessages([
                    $campo => [
                        "No se encontró información para el {$tipoDocumento} ingresado.",
                    ],
                ]);
        }

        if (
            $estadoHttp === 400
            || $estadoHttp === 422
        ) {
            throw ValidationException
                ::withMessages([
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
                "No fue posible autenticar la consulta con {$proveedor}."
            );
        }

        if (
            $estadoHttp === 429
        ) {
            throw new RuntimeException(
                "{$proveedor} alcanzó el límite de consultas permitido."
            );
        }

        if (
            $estadoHttp >= 500
        ) {
            throw new RuntimeException(
                "{$proveedor} presenta una falla temporal."
            );
        }

        throw new RuntimeException(
            "{$proveedor} respondió con el código HTTP {$estadoHttp}."
        );
    }

    /**
     * Obtener un mensaje legible de las
     * distintas estructuras de respuesta.
     */
    private function obtenerMensajeProveedor(
        array $datos
    ): string {
        $mensaje =
            trim(
                (string) (
                    $datos['message']
                    ?? $datos['mensaje']
                    ?? $datos['error']
                    ?? ''
                )
            );

        if (
            $mensaje !== ''
        ) {
            return $mensaje;
        }

        $errores =
            $datos['errors']
            ?? null;

        if (
            is_array($errores)
        ) {
            foreach (
                $errores
                as $error
            ) {
                if (
                    is_array($error)
                    && isset($error[0])
                ) {
                    return trim(
                        (string) $error[0]
                    );
                }

                if (
                    is_string($error)
                ) {
                    return trim(
                        $error
                    );
                }
            }
        }

        return '';
    }
}