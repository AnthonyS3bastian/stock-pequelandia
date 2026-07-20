import { inject, Injectable } from '@angular/core';

import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { Producto } from '../interfaces/producto.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private http = inject(HttpClient);

  private api = 'http://127.0.0.1:8000/api/productos';

  registrar(producto: Producto): Observable<any> {

    return this.http.post<any>(
      this.api,
      producto
    );

  }

}