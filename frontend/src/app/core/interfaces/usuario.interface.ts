export type RolUsuario =
  | 'ADMINISTRADOR'
  | 'EMPLEADO';

export interface Usuario {
  id_usuario: number;
  rol_usuario: RolUsuario;
  nombre_usuario: string;
  estado_usuario: boolean;
  id_personal: number;
}