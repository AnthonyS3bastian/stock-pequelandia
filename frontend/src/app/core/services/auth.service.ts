import {
  Injectable,
  inject,
  signal
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';

import {
  Observable,
  catchError,
  finalize,
  of,
  tap
} from 'rxjs';

import {
  environment
} from '../../../environments/environment';

import {
  LoginRequest
} from '../interfaces/login-request.interface';

import {
  LoginResponse
} from '../interfaces/login-response.interface';

import {
  RolUsuario,
  Usuario
} from '../interfaces/usuario.interface';

interface LogoutResponse {
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    environment.apiUrl;

  private readonly usuarioSignal =
    signal<Usuario | null>(
      this.cargarUsuarioGuardado()
    );

  readonly usuarioActual =
    this.usuarioSignal.asReadonly();

  login(
    datos: LoginRequest
  ): Observable<LoginResponse> {

    return this.http
      .post<LoginResponse>(
        `${this.apiUrl}/login`,
        datos
      )
      .pipe(
        tap(response => {

          const usuarioNormalizado:
            Usuario = {
              ...response.usuario,
              rol_usuario:
                response.usuario
                  .rol_usuario
                  .toUpperCase() as
                    RolUsuario
            };

          localStorage.setItem(
            'token',
            response.token
          );

          localStorage.setItem(
            'usuario',
            JSON.stringify(
              usuarioNormalizado
            )
          );

          this.usuarioSignal.set(
            usuarioNormalizado
          );

        })
      );

  }

  /**
   * Cierra la sesion en Laravel y limpia los datos locales.
   */
  logout(): Observable<
    LogoutResponse | null
  > {

    const token =
      this.getToken();

    if (!token) {

      this.limpiarSesionLocal();

      return of(null);

    }

    const headers =
      new HttpHeaders({
        Authorization:
          `Bearer ${token}`
      });

    return this.http
      .post<LogoutResponse>(
        `${this.apiUrl}/logout`,
        {},
        {
          headers
        }
      )
      .pipe(
        catchError(() => {

          return of(null);

        }),
        finalize(() => {

          this.limpiarSesionLocal();

        })
      );

  }

  /**
   * Limpia la sesion sin llamar al backend.
   *
   * Se utiliza cuando el token no existe,
   * es invalido o la sesion ya expiro.
   */
  limpiarSesionLocal(): void {

    localStorage.removeItem('token');

    localStorage.removeItem('usuario');

    this.usuarioSignal.set(null);

  }

  getToken(): string | null {

    return localStorage.getItem(
      'token'
    );

  }

  getUsuario(): Usuario | null {

    return this.usuarioActual();

  }

  getRol(): RolUsuario | null {

    return (
      this.usuarioActual()
        ?.rol_usuario ?? null
    );

  }

  estaAutenticado(): boolean {

    const token =
      this.getToken();

    const usuario =
      this.getUsuario();

    return Boolean(
      token &&
      usuario &&
      usuario.estado_usuario
    );

  }

  esAdministrador(): boolean {

    return (
      this.getRol() ===
      'ADMINISTRADOR'
    );

  }

  esEmpleado(): boolean {

    return (
      this.getRol() ===
      'EMPLEADO'
    );

  }

  private cargarUsuarioGuardado():
    Usuario | null {

    try {

      const usuarioGuardado =
        localStorage.getItem(
          'usuario'
        );

      if (!usuarioGuardado) {

        return null;

      }

      const usuario =
        JSON.parse(
          usuarioGuardado
        ) as Usuario;

      return {
        ...usuario,
        rol_usuario:
          usuario
            .rol_usuario
            .toUpperCase() as
              RolUsuario
      };

    } catch {

      this.limpiarSesionLocal();

      return null;

    }

  }

}