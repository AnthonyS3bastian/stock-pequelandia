  import { Injectable, inject } from '@angular/core';
  import { HttpClient } from '@angular/common/http';
  import { Observable, tap } from 'rxjs';

  import { environment } from '../../../environments/environment';

  import { LoginRequest } from '../interfaces/login-request.interface';
  import { LoginResponse } from '../interfaces/login-response.interface';

  @Injectable({
    providedIn: 'root'
  })
  export class AuthService {

    private http = inject(HttpClient);

    private apiUrl = environment.apiUrl;

    login(datos: LoginRequest): Observable<LoginResponse> {

      return this.http
        .post<LoginResponse>(`${this.apiUrl}/login`, datos)
        .pipe(

          tap(response => {

            localStorage.setItem('token', response.token);
            localStorage.setItem(
              'usuario',
              JSON.stringify(response.usuario)
            );

          })

        );

    }

    logout(): void {

      localStorage.removeItem('token');
      localStorage.removeItem('usuario');

    }

    getToken(): string | null {

      return localStorage.getItem('token');

    }

    getUsuario() {

      const usuario = localStorage.getItem('usuario');

      return usuario ? JSON.parse(usuario) : null;

    }

    estaAutenticado(): boolean {

      return !!this.getToken();

    }

  }