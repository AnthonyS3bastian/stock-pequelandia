import {
  RolUsuario
} from '../../../core/interfaces/usuario.interface';

export interface PersonalPerfil {
  id_personal: number;
  dni_personal: string;
  nombre_personal: string;
  apellido_personal: string;
  tel_personal: string | null;
}

export interface Perfil {
  id_usuario: number;
  rol_usuario: RolUsuario;
  nombre_usuario: string;
  estado_usuario: boolean;
  id_personal: number;
  personal: PersonalPerfil;
}

export interface PerfilResponse {
  perfil: Perfil;
}