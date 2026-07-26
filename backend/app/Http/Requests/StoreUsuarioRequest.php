<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'dni_personal' => [
                'required',
                'digits:8',
                Rule::unique('personal', 'dni_personal'),
            ],
            'nombre_personal' => [
                'required',
                'string',
                'max:50',
            ],
            'apellido_personal' => [
                'required',
                'string',
                'max:50',
            ],
            'tel_personal' => [
                'nullable',
                'regex:/^[0-9]{6,12}$/',
            ],
            'nombre_usuario' => [
                'required',
                'string',
                'min:3',
                'max:50',
                'alpha_dash',
                Rule::unique('usuario', 'nombre_usuario'),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'dni_personal.required' => 'El DNI es obligatorio.',
            'dni_personal.digits' => 'El DNI debe tener exactamente 8 digitos.',
            'dni_personal.unique' => 'Ya existe una persona registrada con ese DNI.',
            'nombre_personal.required' => 'Los nombres son obligatorios.',
            'nombre_personal.max' => 'Los nombres no deben superar los 50 caracteres.',
            'apellido_personal.required' => 'Los apellidos son obligatorios.',
            'apellido_personal.max' => 'Los apellidos no deben superar los 50 caracteres.',
            'tel_personal.regex' => 'El telefono debe contener entre 6 y 12 numeros.',
            'nombre_usuario.required' => 'El nombre de usuario es obligatorio.',
            'nombre_usuario.min' => 'El nombre de usuario debe tener al menos 3 caracteres.',
            'nombre_usuario.max' => 'El nombre de usuario no debe superar los 50 caracteres.',
            'nombre_usuario.alpha_dash' => 'El nombre de usuario solo puede contener letras, numeros, guiones y guion bajo.',
            'nombre_usuario.unique' => 'Ese nombre de usuario ya se encuentra registrado.',
        ];
    }
}
