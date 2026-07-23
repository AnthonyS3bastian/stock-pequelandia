import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable,
  throwError
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';

import {
  AuthService
} from '../../../core/services/auth.service';

import {
  PerfilResponse
} from '../interfaces/perfil.interface';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {

  private readonly http =
    inject(HttpClient);

  private readonly authService =
    inject(AuthService);

  private readonly apiUrl =
    environment.apiUrl;

  obtenerPerfil():
    Observable<PerfilResponse> {

    const token =
      this.authService.getToken();

    if (!token) {

      return throwError(
        () => new Error(
          'No existe token de autenticacion.'
        )
      );

    }

    return this.http.get<PerfilResponse>(
      `${this.apiUrl}/perfil`,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            'application/json'
        }
      }
    );

  }

}