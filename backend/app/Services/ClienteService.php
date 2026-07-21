<?php

namespace App\Services;

use App\Models\Cliente;
use Illuminate\Validation\ValidationException;

class ClienteService
{
    /**
     * Buscar un cliente por su DNI o RUC.
     */
    public function buscarPorCodigo(string $codigo): ?Cliente
    {
        return Cliente::query()
            ->where('codigo_cliente', $codigo)
            ->first();
    }

    /**
     * Obtener el cliente PUBLICO GENERAL
     * utilizado en una venta rápida.
     */
    public function obtenerPublicoGeneral(): Cliente
    {
        $cliente = Cliente::query()
            ->where('codigo_cliente', '00000000')
            ->first();

        if (!$cliente) {
            throw ValidationException::withMessages([
                'cliente' => [
                    'No existe el cliente PUBLICO GENERAL.',
                ],
            ]);
        }

        if (!$cliente->estado) {
            throw ValidationException::withMessages([
                'cliente' => [
                    'El cliente PUBLICO GENERAL se encuentra inactivo.',
                ],
            ]);
        }

        return $cliente;
    }

    /**
     * Crear o actualizar un cliente natural
     * utilizando la respuesta real de APIsPERU.
     */
    public function guardarClienteNatural(array $datos): Cliente
    {
        $dni = trim(
            (string) ($datos['dni'] ?? '')
        );

        $nombres = trim(
            (string) ($datos['nombres'] ?? '')
        );

        $apellidoPaterno = trim(
            (string) ($datos['apellidoPaterno'] ?? '')
        );

        $apellidoMaterno = trim(
            (string) ($datos['apellidoMaterno'] ?? '')
        );

        if (!preg_match('/^\d{8}$/', $dni)) {
            throw ValidationException::withMessages([
                'dni' => [
                    'El DNI debe contener exactamente 8 dígitos.',
                ],
            ]);
        }

        if ($nombres === '') {
            throw ValidationException::withMessages([
                'nombres' => [
                    'No se encontraron los nombres del cliente.',
                ],
            ]);
        }

        $apellidos = trim(
            $apellidoPaterno . ' ' . $apellidoMaterno
        );

        if ($apellidos === '') {
            throw ValidationException::withMessages([
                'apellidos' => [
                    'No se encontraron los apellidos del cliente.',
                ],
            ]);
        }

        return Cliente::updateOrCreate(
            [
                'codigo_cliente' => $dni,
            ],
            [
                'tipo_cliente' => 'Natural',
                'nombres_cliente' => $nombres,
                'apellidos_cliente' => $apellidos,
                'razon_social_cliente' => null,
                'direccion_cliente' => null,
                'estado' => true,
            ]
        );
    }

    /**
     * Crear o actualizar una empresa
     * utilizando la respuesta real de APIsPERU.
     */
    public function guardarClienteEmpresa(array $datos): Cliente
    {
        $ruc = trim(
            (string) ($datos['ruc'] ?? '')
        );

        $razonSocial = trim(
            (string) ($datos['razonSocial'] ?? '')
        );

        $direccion = trim(
            (string) ($datos['direccion'] ?? '')
        );

        $estadoSunat = strtoupper(
            trim((string) ($datos['estado'] ?? ''))
        );

        $condicionSunat = strtoupper(
            trim((string) ($datos['condicion'] ?? ''))
        );

        if (!preg_match('/^\d{11}$/', $ruc)) {
            throw ValidationException::withMessages([
                'ruc' => [
                    'El RUC debe contener exactamente 11 dígitos.',
                ],
            ]);
        }

        if ($razonSocial === '') {
            throw ValidationException::withMessages([
                'razon_social' => [
                    'No se encontró la razón social de la empresa.',
                ],
            ]);
        }

        if ($estadoSunat !== 'ACTIVO') {
            throw ValidationException::withMessages([
                'ruc' => [
                    'El RUC consultado no se encuentra ACTIVO.',
                ],
            ]);
        }

        if ($condicionSunat !== 'HABIDO') {
            throw ValidationException::withMessages([
                'ruc' => [
                    'El domicilio fiscal del RUC no tiene condición HABIDO.',
                ],
            ]);
        }

        return Cliente::updateOrCreate(
            [
                'codigo_cliente' => $ruc,
            ],
            [
                'tipo_cliente' => 'Empresa',
                'nombres_cliente' => null,
                'apellidos_cliente' => null,
                'razon_social_cliente' => $razonSocial,
                'direccion_cliente' =>
                    $direccion !== '' ? $direccion : null,
                'estado' => true,
            ]
        );
    }
}