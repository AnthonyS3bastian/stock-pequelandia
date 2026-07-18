<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCategoriaRequest extends FormRequest
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
        $idCategoria = $this->route('id');

        return [
            'nombre_categoria' => [
                'required',
                'string',
                'max:100',
                Rule::unique('categoria', 'nombre_categoria')->ignore($idCategoria, 'id_categoria'),
            ],

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
            'nombre_categoria.max' => 'El nombre no puede superar los 100 caracteres.',
            'nombre_categoria.unique' => 'Ya existe una categoría con ese nombre.',

            'descripcion_categoria.max' => 'La descripción no puede superar los 255 caracteres.',

            'estado.required' => 'El estado es obligatorio.',
            'estado.boolean' => 'El estado debe ser verdadero o falso.',
        ];
    }
}