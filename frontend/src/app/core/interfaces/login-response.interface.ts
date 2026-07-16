import { Usuario } from './usuario.interface';

export interface LoginResponse {
  mensaje: string;
  usuario: Usuario;
  token: string;
}