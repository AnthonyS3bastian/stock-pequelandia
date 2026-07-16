<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\UsuarioService;

class AuthController extends Controller
{
    protected UsuarioService $usuarioService;

    public function __construct(UsuarioService $usuarioService)
    {
        $this->usuarioService = $usuarioService;
    }

    public function login(Request $request)
{
    $request->validate([
        'nombre_usuario' => 'required|string',
        'password' => 'required|string',
    ]);

    $resultado = $this->usuarioService->login(
        $request->nombre_usuario,
        $request->password
    );

    return response()->json([
        'mensaje' => 'Inicio de sesion exitoso.',
        'usuario' => $resultado['usuario'],
        'token' => $resultado['token'],
    ]);
}
}