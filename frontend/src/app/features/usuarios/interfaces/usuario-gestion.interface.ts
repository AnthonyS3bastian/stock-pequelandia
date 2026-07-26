import {
  Usuario
} from '../../../core/interfaces/usuario.interface';

export interface CrearEmpleadoRequest {
  dni_personal: string;
  nombre_personal: string;
  apellido_personal: string;
  tel_personal: string | null;
  nombre_usuario: string;
}

export interface UsuariosResponse {
  usuarios: Usuario[];
}

export interface UsuarioResponse {
  mensaje: string;
  usuario: Usuario;
}
