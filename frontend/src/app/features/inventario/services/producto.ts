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

    /**
     * Listar productos.
     */
    listar(): Observable<any> {

        return this.http.get<any>(this.api);

    }

    /**
     * Buscar producto por código de barras.
     */
    buscarPorCodigo(codigo: string): Observable<any> {

        return this.http.get<any>(
            `${this.api}/codigo/${codigo}`
        );

    }

    /**
     * Registrar producto.
     */
    registrar(producto: Producto): Observable<any> {

        return this.http.post<any>(
            this.api,
            producto
        );

    }

}