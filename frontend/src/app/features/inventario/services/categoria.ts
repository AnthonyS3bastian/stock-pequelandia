import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria } from '../interfaces/categoria.interface';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private http = inject(HttpClient);

  private readonly apiUrl = 'http://127.0.0.1:8000/api/categorias';

  listar(): Observable<{ mensaje: string; data: Categoria[] }> {
    return this.http.get<{ mensaje: string; data: Categoria[] }>(this.apiUrl);
  }

  obtenerPorId(id: number): Observable<{ mensaje: string; data: Categoria }> {
    return this.http.get<{ mensaje: string; data: Categoria }>(
      `${this.apiUrl}/${id}`
    );
  }

  crear(categoria: Partial<Categoria>): Observable<{ mensaje: string; data: Categoria }> {
    return this.http.post<{ mensaje: string; data: Categoria }>(
      this.apiUrl,
      categoria
    );
  }

  actualizar(id: number, categoria: Partial<Categoria>): Observable<{ mensaje: string; data: Categoria }> {
    return this.http.put<{ mensaje: string; data: Categoria }>(
      `${this.apiUrl}/${id}`,
      categoria
    );
  }

  eliminar(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(
      `${this.apiUrl}/${id}`
    );
  }

}