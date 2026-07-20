<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreVentaRequest extends FormRequest
{
    /**
     * Determina si el usuario está autorizado.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación para registrar una venta.
     */
    public function rules(): array
    {
        return [
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

    /**
     * Mensajes personalizados.
     */
    public function messages(): array
    {
        return [
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
}