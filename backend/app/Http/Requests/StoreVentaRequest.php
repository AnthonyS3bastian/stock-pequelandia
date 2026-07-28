<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreVentaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /*
             * Valores internos:
             *
             * VENTA RAPIDA = Público general.
             * BOLETA       = Cliente con DNI.
             * FACTURA      = Cliente con RUC.
             *
             * Todos generan una NOTA DE VENTA.
             */
            'tipo_comprobante' => [
                'required',
                'string',
                Rule::in([
                    'VENTA RAPIDA',
                    'BOLETA',
                    'FACTURA',
                ]),
            ],

            'numero_documento' => [
                Rule::requiredIf(
                    fn (): bool =>
                        in_array(
                            $this->input(
                                'tipo_comprobante'
                            ),
                            [
                                'BOLETA',
                                'FACTURA',
                            ],
                            true
                        )
                ),

                'nullable',
                'string',

                function (
                    string $attribute,
                    mixed $value,
                    \Closure $fail
                ): void {
                    $tipoComprobante =
                        $this->input(
                            'tipo_comprobante'
                        );

                    $documento =
                        preg_replace(
                            '/\D+/',
                            '',
                            (string) $value
                        );

                    $documento =
                        $documento ?? '';

                    if (
                        $tipoComprobante
                        === 'BOLETA'
                        && !preg_match(
                            '/^\d{8}$/',
                            $documento
                        )
                    ) {
                        $fail(
                            'El DNI debe contener exactamente 8 dígitos.'
                        );
                    }

                    if (
                        $tipoComprobante
                        === 'FACTURA'
                        && !preg_match(
                            '/^\d{11}$/',
                            $documento
                        )
                    ) {
                        $fail(
                            'El RUC debe contener exactamente 11 dígitos.'
                        );
                    }
                },
            ],

            'detalles' => [
                'required',
                'array',
                'min:1',
            ],

            'detalles.*.id_producto' => [
                'required',
                'integer',
                'exists:producto,id_producto',
            ],

            'detalles.*.cantidad' => [
                'required',
                'integer',
                'min:1',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'tipo_comprobante.required' =>
                'Debe seleccionar el tipo de cliente.',

            'tipo_comprobante.in' =>
                'El tipo de cliente seleccionado no es válido.',

            'numero_documento.required' =>
                'El documento del cliente es obligatorio.',

            'detalles.required' =>
                'La venta debe contener al menos un producto.',

            'detalles.array' =>
                'Los productos de la venta deben enviarse en una lista.',

            'detalles.min' =>
                'La venta debe contener al menos un producto.',

            'detalles.*.id_producto.required' =>
                'El producto es obligatorio.',

            'detalles.*.id_producto.integer' =>
                'El identificador del producto no es válido.',

            'detalles.*.id_producto.exists' =>
                'Uno de los productos seleccionados no existe.',

            'detalles.*.cantidad.required' =>
                'La cantidad del producto es obligatoria.',

            'detalles.*.cantidad.integer' =>
                'La cantidad debe ser un número entero.',

            'detalles.*.cantidad.min' =>
                'La cantidad debe ser mayor que cero.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $tipoComprobante =
            strtoupper(
                trim(
                    (string) $this->input(
                        'tipo_comprobante'
                    )
                )
            );

        $numeroDocumento =
            preg_replace(
                '/\D+/',
                '',
                (string) $this->input(
                    'numero_documento'
                )
            );

        $numeroDocumento =
            $numeroDocumento ?? '';

        $this->merge([
            'tipo_comprobante' =>
                $tipoComprobante,

            'numero_documento' =>
                $numeroDocumento !== ''
                    ? $numeroDocumento
                    : null,
        ]);
    }
}