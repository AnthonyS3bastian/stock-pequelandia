<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            /*
             * Compatibilidad temporal.
             * El frontend nuevo ya no envia
             * codigo_producto.
             */
            'codigo_producto' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique(
                    'codigo_barra',
                    'codigo_barra'
                ),
            ],

            'codigos_barra' => [
                'sometimes',
                'array',
                'max:10',
            ],

            'codigos_barra.*' => [
                'required',
                'string',
                'max:50',
                'distinct',
                Rule::unique(
                    'codigo_barra',
                    'codigo_barra'
                ),
            ],

            'nombre_producto' => [
                'required',
                'string',
                'max:150',
            ],

            'descripcion_producto' => [
                'nullable',
                'string',
            ],

            'id_categoria' => [
                'required',
                'integer',
                'exists:categoria,id_categoria',
            ],

            'precio_producto' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            /*
             * Campos heredados.
             * Ya no los envia el formulario de producto,
             * pero permanecen temporalmente compatibles.
             */
            'costo_producto' => [
                'nullable',
                'numeric',
                'min:0',
            ],

            'fecha_caducidad' => [
                'nullable',
                'date',
            ],

            'stock_producto' => [
                'sometimes',
                'integer',
                'min:0',
            ],

            'stock_minimo_producto' => [
                'sometimes',
                'integer',
                'min:0',
            ],

            'estado' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function withValidator(
        Validator $validator
    ): void {

        $validator->after(
            function (
                Validator $validator
            ): void {

                $stock = (int) $this->input(
                    'stock_producto',
                    0
                );

                if (
                    $stock > 0
                    && (
                        $this->input(
                            'costo_producto'
                        ) === null
                        || $this->input(
                            'costo_producto'
                        ) === ''
                    )
                ) {

                    $validator
                        ->errors()
                        ->add(
                            'costo_producto',
                            'El costo de compra es obligatorio cuando se registra stock inicial.'
                        );
                }
            }
        );
    }

    public function messages(): array
    {
        return [
            'codigo_producto.max' =>
                'El codigo de barras no puede superar los 50 caracteres.',

            'codigo_producto.unique' =>
                'Ese codigo de barras ya pertenece a otro producto.',

            'codigos_barra.array' =>
                'Los codigos de barras enviados no son validos.',

            'codigos_barra.max' =>
                'Se pueden registrar como maximo 10 codigos de barras por producto.',

            'codigos_barra.*.required' =>
                'El codigo de barras no puede estar vacio.',

            'codigos_barra.*.max' =>
                'El codigo de barras no puede superar los 50 caracteres.',

            'codigos_barra.*.distinct' =>
                'No se puede repetir el mismo codigo de barras.',

            'codigos_barra.*.unique' =>
                'Uno de los codigos de barras ya pertenece a otro producto.',

            'nombre_producto.required' =>
                'El nombre del producto es obligatorio.',

            'nombre_producto.max' =>
                'El nombre no puede superar los 150 caracteres.',

            'id_categoria.required' =>
                'La categoria es obligatoria.',

            'id_categoria.exists' =>
                'La categoria seleccionada no existe.',

            'precio_producto.required' =>
                'El precio de venta es obligatorio.',

            'precio_producto.numeric' =>
                'El precio de venta debe ser numerico.',

            'precio_producto.min' =>
                'El precio de venta debe ser mayor que cero.',

            'stock_minimo_producto.integer' =>
                'El stock minimo debe ser un numero entero.',

            'stock_minimo_producto.min' =>
                'El stock minimo no puede ser negativo.',

            'estado.boolean' =>
                'El estado del producto no es valido.',
        ];
    }
}