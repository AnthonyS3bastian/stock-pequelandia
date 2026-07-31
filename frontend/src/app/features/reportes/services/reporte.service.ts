import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  environment
} from '../../../../environments/environment';

import {
  AuthService
} from '../../../core/services/auth.service';

export interface ProductoMasVendidoReporte {
  id_producto: number;
  nombre_producto: string;
  cantidad: number;
}

export interface VentaPorUsuarioReporte {
  id_usuario: number;
  usuario: string;
  cantidad_ventas: number;
  total_vendido: number;
}

export interface UltimaVentaReporte {
  id_venta: number;
  numero_venta: string;
  numero_comprobante: string;
  fecha?: string;
  hora: string;
  productos: string;
  usuario: string;
  total: number;
  estado: string;
  descripcion: string;
  fecha_anulacion?: string | null;
  hora_anulacion?: string | null;
  usuario_anulacion?: string | null;
}

export interface VentaPorHoraReporte {
  hora: string;
  total_vendido: number;
  numero_ventas: number;
}

export interface VentaPorDiaReporte {
  fecha: string;
  dia: string;
  numero_dia: number;
  total_vendido: number;
  numero_ventas: number;
  productos_vendidos: number;
  meta_diaria: number;
  meta_cumplida: boolean;
}

export interface MejorDiaReporte
extends VentaPorDiaReporte {
}

export interface ResumenInventarioReporte {
  fecha_calculo: string;
  valor_comercial_inventario: number;
  total_unidades: number;
  productos_con_stock: number;
  total_productos: number;
}

export interface ResumenInventarioResponse {
  ok: boolean;
  mensaje: string;
  reporte: ResumenInventarioReporte;
}

export interface ReporteDiario {
  fecha: string;
  total_vendido: number;
  costo_estimado: number;
  ganancia_estimada: number;
  numero_ventas: number;
  productos_vendidos: number;
  ticket_promedio: number;
  meta_diaria: number;
  porcentaje_meta: number;
  meta_cumplida: boolean;
  producto_mas_vendido:
    ProductoMasVendidoReporte | null;
  ventas_por_usuario:
    VentaPorUsuarioReporte[];
  ventas_por_hora:
    VentaPorHoraReporte[];
  ultimas_ventas:
    UltimaVentaReporte[];
}

export interface ReporteDiarioResponse {
  ok: boolean;
  mensaje: string;
  reporte: ReporteDiario;
}

export interface ReporteSemanal {
  fecha_referencia: string;
  inicio_semana: string;
  fin_semana: string;
  total_vendido: number;
  costo_estimado: number;
  ganancia_estimada: number;
  numero_ventas: number;
  productos_vendidos: number;
  ticket_promedio: number;
  meta_diaria: number;
  meta_semanal: number;
  porcentaje_meta: number;
  meta_cumplida: boolean;
  dias_meta_cumplida: number;
  mejor_dia:
    MejorDiaReporte | null;
  producto_mas_vendido:
    ProductoMasVendidoReporte | null;
  ventas_por_usuario:
    VentaPorUsuarioReporte[];
  ventas_por_dia:
    VentaPorDiaReporte[];
  ultimas_ventas:
    UltimaVentaReporte[];
}

export interface ReporteSemanalResponse {
  ok: boolean;
  mensaje: string;
  reporte: ReporteSemanal;
}

export interface ReporteMensual {
  fecha_referencia: string;
  inicio_mes: string;
  fin_mes: string;
  mes: number;
  anio: number;
  nombre_mes: string;
  cantidad_dias_mes: number;
  total_vendido: number;
  costo_estimado: number;
  ganancia_estimada: number;
  numero_ventas: number;
  productos_vendidos: number;
  ticket_promedio: number;
  meta_diaria: number;
  meta_mensual: number;
  porcentaje_meta: number;
  meta_cumplida: boolean;
  dias_meta_cumplida: number;
  mejor_dia:
    MejorDiaReporte | null;
  producto_mas_vendido:
    ProductoMasVendidoReporte | null;
  ventas_por_usuario:
    VentaPorUsuarioReporte[];
  ventas_por_dia:
    VentaPorDiaReporte[];
  ultimas_ventas:
    UltimaVentaReporte[];
}

export interface ReporteMensualResponse {
  ok: boolean;
  mensaje: string;
  reporte: ReporteMensual;
}

@Injectable({
  providedIn: 'root'
})
export class ReporteService {

  private readonly http =
    inject(HttpClient);

  private readonly authService =
    inject(AuthService);

  private readonly apiUrl =
    `${environment.apiUrl}/reportes`;

  obtenerResumenInventario():
    Observable<ResumenInventarioResponse> {

    const headers =
      this.obtenerHeadersAutenticacion();

    return this.http
      .get<ResumenInventarioResponse>(
        `${this.apiUrl}/inventario`,
        {
          headers
        }
      );

  }

  obtenerReporteDiario(
    fecha: string
  ): Observable<ReporteDiarioResponse> {

    return this.obtenerReporte<
      ReporteDiarioResponse
    >(
      'diario',
      fecha
    );

  }

  obtenerReporteSemanal(
    fecha: string
  ): Observable<ReporteSemanalResponse> {

    return this.obtenerReporte<
      ReporteSemanalResponse
    >(
      'semanal',
      fecha
    );

  }

  obtenerReporteMensual(
    fecha: string
  ): Observable<ReporteMensualResponse> {

    return this.obtenerReporte<
      ReporteMensualResponse
    >(
      'mensual',
      fecha
    );

  }

  private obtenerReporte<T>(
    periodo: string,
    fecha: string
  ): Observable<T> {

    const headers =
      this.obtenerHeadersAutenticacion();

    const params =
      new HttpParams()
        .set(
          'fecha',
          fecha
        );

    return this.http.get<T>(
      `${this.apiUrl}/${periodo}`,
      {
        headers,
        params
      }
    );

  }

  private obtenerHeadersAutenticacion():
    HttpHeaders {

    const token =
      this.authService.getToken();

    if (!token) {

      return new HttpHeaders({
        Accept:
          'application/json'
      });

    }

    return new HttpHeaders({
      Accept:
        'application/json',

      Authorization:
        `Bearer ${token}`
    });

  }

}