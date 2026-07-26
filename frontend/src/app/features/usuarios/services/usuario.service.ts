import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';

import {
  CrearEmpleadoRequest,
  UsuarioResponse,
  UsuariosResponse
} from '../interfaces/usuario-gestion.interface';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/usuarios`;

  listar(): Observable<UsuariosResponse> {

    return this.http
      .get<UsuariosResponse>(
        this.apiUrl
      );

  }

  crear(
    datos: CrearEmpleadoRequest
  ): Observable<UsuarioResponse> {

    return this.http
      .post<UsuarioResponse>(
        this.apiUrl,
        datos
      );

  }

  cambiarEstado(
    idUsuario: number
  ): Observable<UsuarioResponse> {

    return this.http
      .patch<UsuarioResponse>(
        `${this.apiUrl}/${idUsuario}/estado`,
        {}
      );

  }

  restablecerPassword(
    idUsuario: number
  ): Observable<UsuarioResponse> {

    return this.http
      .patch<UsuarioResponse>(
        `${this.apiUrl}/${idUsuario}/restablecer-password`,
        {}
      );

  }

}
