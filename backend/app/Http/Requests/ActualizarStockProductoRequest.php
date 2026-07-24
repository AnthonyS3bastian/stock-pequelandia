<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ActualizarStockProductoRequest extends FormRequest
{
    /**
     * Determinar si el usuario puede realizar esta solicitud.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validacion.
     */
    public function rules(): array
    {
        return [
            'operacion' => [
                'required',
                'string',
                Rule::in([
                    'agregar',
                    'retirar',
                    'establecer',
                ]),
            ],

            'cantidad' => [
                'required',
                'integer',
                'min:0',
            ],
        ];
    }

    /**
     * Validaciones adicionales.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {

                $operacion =
                    $this->input('operacion');

                $cantidad =
                    (int) $this->input(
                        'cantidad',
                        0
                    );

                if (
                    in_array(
                        $operacion,
                        [
                            'agregar',
                            'retirar',
                        ],
                        true
                    )
                    && $cantidad <= 0
                ) {

                    $validator
                        ->errors()
                        ->add(
                            'cantidad',
                            'La cantidad debe ser mayor que cero.'
                        );

                }

            },
        ];
    }

    /**
     * Mensajes personalizados.
     */
    public function messages(): array
    {
        return [
            'operacion.required' =>
                'La operacion de stock es obligatoria.',

            'operacion.string' =>
                'La operacion de stock no es valida.',

            'operacion.in' =>
                'La operacion debe ser agregar, retirar o establecer.',

            'cantidad.required' =>
                'La cantidad es obligatoria.',

            'cantidad.integer' =>
                'La cantidad debe ser un numero entero.',

            'cantidad.min' =>
                'La cantidad no puede ser negativa.',
        ];
    }
}