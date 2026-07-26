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

    /**
     * Listar todas las cuentas.
     */
    public function index(): JsonResponse
    {
        return response()->json([
            'usuarios' =>
                $this->usuarioService
                    ->listarUsuarios(),
        ]);
    }

    /**
     * Crear una cuenta de empleado.
     */
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
                'Empleado creado correctamente. La contrasena inicial es su DNI.',
            'usuario' => $usuario,
        ], 201);
    }

    /**
     * Activar o desactivar una cuenta de empleado.
     */
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
                ? 'Cuenta activada correctamente.'
                : 'Cuenta desactivada correctamente.';

        return response()->json([
            'mensaje' => $mensaje,
            'usuario' => $usuario,
        ]);
    }

    /**
     * Restablecer la contrasena de un empleado a su DNI.
     */
    public function restablecerPassword(
        int $id
    ): JsonResponse {

        $usuario =
            $this->usuarioService
                ->restablecerPassword($id);

        return response()->json([
            'mensaje' =>
                'Contrasena restablecida correctamente. La nueva contrasena es el DNI del empleado.',
            'usuario' => $usuario,
        ]);
    }
}
