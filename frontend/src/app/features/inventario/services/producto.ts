import {
  inject,
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  Producto
} from '../interfaces/producto.interface';

export type OperacionStock =
  | 'agregar'
  | 'retirar'
  | 'establecer';

export interface ActualizarStockRequest {

  operacion: OperacionStock;

  cantidad: number;

}

export interface RespuestaProductos {

  mensaje: string;

  data: Producto[];

}

export interface RespuestaProducto {

  mensaje: string;

  data: Producto;

}

export interface RespuestaMensaje {

  mensaje: string;

}

@Injectable({
  providedIn: 'root'
})
export class ProductoService {

  private http =
    inject(HttpClient);

  private readonly api =
    'http://127.0.0.1:8000/api/productos';

  listar():
    Observable<RespuestaProductos> {

    return this.http
      .get<RespuestaProductos>(
        this.api
      );

  }

  obtenerPorId(
    idProducto: number
  ): Observable<RespuestaProducto> {

    return this.http
      .get<RespuestaProducto>(
        `${this.api}/${idProducto}`
      );

  }

  buscarPorCodigo(
    codigo: string
  ): Observable<RespuestaProducto> {

    const codigoSeguro =
      encodeURIComponent(
        codigo.trim()
      );

    return this.http
      .get<RespuestaProducto>(
        `${this.api}/codigo/${codigoSeguro}`
      );

  }

  registrar(
    producto: Producto
  ): Observable<RespuestaProducto> {

    return this.http
      .post<RespuestaProducto>(
        this.api,
        producto
      );

  }

  actualizar(
    idProducto: number,
    producto: Producto
  ): Observable<RespuestaProducto> {

    return this.http
      .put<RespuestaProducto>(
        `${this.api}/${idProducto}`,
        producto
      );

  }

  actualizarStock(
    idProducto: number,
    datos: ActualizarStockRequest
  ): Observable<RespuestaProducto> {

    return this.http
      .patch<RespuestaProducto>(
        `${this.api}/${idProducto}/stock`,
        datos
      );

  }

  cambiarEstado(
    idProducto: number
  ): Observable<RespuestaProducto> {

    return this.http
      .patch<RespuestaProducto>(
        `${this.api}/${idProducto}/estado`,
        {}
      );

  }

  eliminar(
    idProducto: number
  ): Observable<RespuestaMensaje> {

    return this.http
      .delete<RespuestaMensaje>(
        `${this.api}/${idProducto}`
      );

  }

}