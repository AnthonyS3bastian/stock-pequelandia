<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductoRequest extends FormRequest
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
        $idProducto =
            $this->route('id');

        return [
            'codigo_producto' => [
                'required',
                'string',
                'max:50',
                Rule::unique(
                    'producto',
                    'codigo_producto'
                )->ignore(
                    $idProducto,
                    'id_producto'
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
                'min:0',
            ],

            'costo_producto' => [
                'required',
                'numeric',
                'min:0',
            ],

            'fecha_caducidad' => [
                'nullable',
                'date',
            ],

            /*
             * El stock actual ya no se actualiza
             * mediante la edicion general.
             */
            'stock_minimo_producto' => [
                'required',
                'integer',
                'min:0',
            ],

            'estado' => [
                'required',
                'boolean',
            ],
        ];
    }

    /**
     * Mensajes personalizados.
     */
    public function messages(): array
    {
        return [
            'codigo_producto.required' =>
                'El codigo del producto es obligatorio.',

            'codigo_producto.string' =>
                'El codigo del producto debe ser un texto valido.',

            'codigo_producto.unique' =>
                'Ya existe un producto con ese codigo.',

            'codigo_producto.max' =>
                'El codigo no puede superar los 50 caracteres.',

            'nombre_producto.required' =>
                'El nombre del producto es obligatorio.',

            'nombre_producto.string' =>
                'El nombre del producto debe ser un texto valido.',

            'nombre_producto.max' =>
                'El nombre no puede superar los 150 caracteres.',

            'descripcion_producto.string' =>
                'La descripcion debe ser un texto valido.',

            'id_categoria.required' =>
                'La categoria es obligatoria.',

            'id_categoria.integer' =>
                'La categoria seleccionada no es valida.',

            'id_categoria.exists' =>
                'La categoria seleccionada no existe.',

            'precio_producto.required' =>
                'El precio de venta es obligatorio.',

            'precio_producto.numeric' =>
                'El precio de venta debe ser numerico.',

            'precio_producto.min' =>
                'El precio de venta no puede ser negativo.',

            'costo_producto.required' =>
                'El precio de compra es obligatorio.',

            'costo_producto.numeric' =>
                'El precio de compra debe ser numerico.',

            'costo_producto.min' =>
                'El precio de compra no puede ser negativo.',

            'fecha_caducidad.date' =>
                'La fecha de caducidad no es valida.',

            'stock_minimo_producto.required' =>
                'El stock minimo es obligatorio.',

            'stock_minimo_producto.integer' =>
                'El stock minimo debe ser un numero entero.',

            'stock_minimo_producto.min' =>
                'El stock minimo no puede ser negativo.',

            'estado.required' =>
                'El estado es obligatorio.',

            'estado.boolean' =>
                'El estado debe ser verdadero o falso.',
        ];
    }
}