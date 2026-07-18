<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCategoriaRequest extends FormRequest
{
    /**
     * Determinar si el usuario puede realizar esta solicitud.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Reglas de validación.
     */
    public function rules(): array
    {
        return [
            'nombre_categoria' => 'required|string|max:100|unique:categoria,nombre_categoria',
            'descripcion_categoria' => 'nullable|string|max:255',
            'estado' => 'required|boolean',
        ];
    }

    /**
     * Mensajes personalizados.
     */
    public function messages(): array
    {
        return [
            'nombre_categoria.required' => 'El nombre de la categoría es obligatorio.',
            'nombre_categoria.unique' => 'Ya existe una categoría con ese nombre.',
            'nombre_categoria.max' => 'El nombre no puede superar los 100 caracteres.',

            'descripcion_categoria.max' => 'La descripción no puede superar los 255 caracteres.',

            'estado.required' => 'El estado es obligatorio.',
            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ];
    }
}