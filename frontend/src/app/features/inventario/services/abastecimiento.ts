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

import {
  environment
} from '../../../../environments/environment';

export interface RegistrarAbastecimientoRequest {
  id_producto: number;
  cantidad: number;
  costo_unitario: number;
  fecha_caducidad: string | null;
  codigo_barra: string | null;
  precio_venta: number | null;
}

export interface LoteAbastecimiento {
  id_lote_producto: number;
  id_producto: number;
  cantidad_inicial: number;
  cantidad_disponible: number;
  costo_unitario: number;
  fecha_ingreso: string;
  fecha_caducidad: string | null;
  estado: boolean;

  producto: Producto;
}

export interface RespuestaAbastecimiento {
  mensaje: string;
  data: LoteAbastecimiento;
}

@Injectable({
  providedIn: 'root'
})
export class AbastecimientoService {

  private readonly http =
    inject(HttpClient);

  private readonly api =
    `${environment.apiUrl}/abastecimientos`;

  registrar(
    datos: RegistrarAbastecimientoRequest
  ): Observable<RespuestaAbastecimiento> {

    return this.http.post<RespuestaAbastecimiento>(
      this.api,
      datos
    );

  }

}