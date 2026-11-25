<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUsuarioRequest;
use App\Models\Usuario;
use App\Services\UsuarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    public function __construct(
        private readonly UsuarioService $usuarioService
    ) {
    }

    public function index(): JsonResponse
    {
        return response()->json([
            'usuarios' =>
                $this->usuarioService
                    ->listarUsuarios(),
        ]);
    }

    public function store(
        StoreUsuarioRequest $request
    ): JsonResponse {

        $usuario =
            $this->usuarioService
                ->crearEmpleado(
                    $request->validated()
                );

        return response()->json([
            'mensaje' =>
                'Vendedor creado correctamente. La contraseña inicial es su DNI.',
            'usuario' =>
                $usuario,
        ], 201);
    }

    public function cambiarEstado(
        Request $request,
        int $id
    ): JsonResponse {

        /** @var Usuario $usuarioAutenticado */
        $usuarioAutenticado =
            $request->user();

        $usuario =
            $this->usuarioService
                ->cambiarEstado(
                    $id,
                    $usuarioAutenticado
                );

        $mensaje =
            $usuario->estado_usuario
                ? 'Cuenta de vendedor activada correctamente.'
                : 'Cuenta de vendedor desactivada correctamente.';

        return response()->json([
            'mensaje' =>
                $mensaje,

            'usuario' =>
                $usuario,
        ]);
    }

    public function restablecerPassword(
        int $id
    ): JsonResponse {

        $usuario =
            $this->usuarioService
                ->restablecerPassword(
                    $id
                );

        return response()->json([
            'mensaje' =>
                'Contraseña restablecida correctamente. La nueva contraseña es el DNI del vendedor.',

            'usuario' =>
                $usuario,
        ]);
    }
}