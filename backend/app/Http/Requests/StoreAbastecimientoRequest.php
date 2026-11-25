<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreAbastecimientoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'id_producto' => [
                'required',
                'integer',
                'exists:producto,id_producto',
            ],

            'cantidad' => [
                'required',
                'integer',
                'min:1',
            ],

            'costo_unitario' => [
                'required',
                'numeric',
                'min:0.01',
            ],

            'fecha_caducidad' => [
                'nullable',
                'date',
            ],

            /*
             * Si el nuevo ingreso trae un codigo
             * diferente para el mismo producto,
             * puede registrarse aqui.
             */
            'codigo_barra' => [
                'nullable',
                'string',
                'max:50',
            ],

            /*
             * Opcional.
             * Solo se envia si la administradora
             * decide cambiar el precio de venta.
             */
            'precio_venta' => [
                'nullable',
                'numeric',
                'min:0.01',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'id_producto.required' =>
                'Debe seleccionar un producto.',

            'id_producto.exists' =>
                'El producto seleccionado no existe.',

            'cantidad.required' =>
                'La cantidad recibida es obligatoria.',

            'cantidad.integer' =>
                'La cantidad debe ser un numero entero.',

            'cantidad.min' =>
                'La cantidad debe ser mayor que cero.',

            'costo_unitario.required' =>
                'El costo unitario es obligatorio.',

            'costo_unitario.numeric' =>
                'El costo unitario debe ser numerico.',

            'costo_unitario.min' =>
                'El costo unitario debe ser mayor que cero.',

            'fecha_caducidad.date' =>
                'La fecha de caducidad no es valida.',

            'codigo_barra.max' =>
                'El codigo de barras no puede superar los 50 caracteres.',

            'precio_venta.numeric' =>
                'El precio de venta debe ser numerico.',

            'precio_venta.min' =>
                'El precio de venta debe ser mayor que cero.',
        ];
    }
}