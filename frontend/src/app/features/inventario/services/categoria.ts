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
  Categoria,
  CategoriaPayload,
  CategoriaResponse,
  CategoriasResponse
} from '../interfaces/categoria.interface';

interface MensajeResponse {
  mensaje: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private readonly http =
    inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/categorias`;

  listar(): Observable<
    CategoriasResponse
  > {

    return this.http.get<
      CategoriasResponse
    >(
      this.apiUrl
    );

  }

  obtenerPorId(
    id: number
  ): Observable<CategoriaResponse> {

    return this.http.get<
      CategoriaResponse
    >(
      `${this.apiUrl}/${id}`
    );

  }

  crear(
    categoria: CategoriaPayload
  ): Observable<CategoriaResponse> {

    return this.http.post<
      CategoriaResponse
    >(
      this.apiUrl,
      categoria
    );

  }

  actualizar(
    id: number,
    categoria: CategoriaPayload
  ): Observable<CategoriaResponse> {

    return this.http.put<
      CategoriaResponse
    >(
      `${this.apiUrl}/${id}`,
      categoria
    );

  }

  eliminar(
    id: number
  ): Observable<MensajeResponse> {

    return this.http.delete<
      MensajeResponse
    >(
      `${this.apiUrl}/${id}`
    );

  }

}
