<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CambiarPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password_actual' => [
                'required',
                'string',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:100',
                'confirmed',
                'different:password_actual',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'password_actual.required' => 'La contrasena actual es obligatoria.',
            'password.required' => 'La nueva contrasena es obligatoria.',
            'password.min' => 'La nueva contrasena debe tener al menos 8 caracteres.',
            'password.max' => 'La nueva contrasena no debe superar los 100 caracteres.',
            'password.confirmed' => 'La confirmacion de la nueva contrasena no coincide.',
            'password.different' => 'La nueva contrasena debe ser diferente de la contrasena actual.',
        ];
    }
}
