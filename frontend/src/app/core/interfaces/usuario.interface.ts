export type RolUsuario =
  | 'ADMINISTRADOR'
  | 'EMPLEADO';

export interface Personal {
  id_personal: number;
  dni_personal: string;
  nombre_personal: string;
  apellido_personal: string;
  tel_personal: string | null;
}

export interface Usuario {
  id_usuario: number;
  rol_usuario: RolUsuario;
  nombre_usuario: string;
  estado_usuario: boolean;
  id_personal: number;
  personal?: Personal | null;
}

export interface PerfilResponse {
  perfil: Usuario;
}

export interface CambiarPasswordRequest {
  password_actual: string;
  password: string;
  password_confirmation: string;
}

export interface MensajeResponse {
  mensaje: string;
}
