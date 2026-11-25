<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProductoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
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

    public function messages(): array
    {
        return [
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

            'stock_minimo_producto.required' =>
                'El stock minimo es obligatorio.',

            'stock_minimo_producto.integer' =>
                'El stock minimo debe ser un numero entero.',

            'stock_minimo_producto.min' =>
                'El stock minimo no puede ser negativo.',

            'estado.required' =>
                'El estado es obligatorio.',

            'estado.boolean' =>
                'El estado del producto no es valido.',
        ];
    }
}