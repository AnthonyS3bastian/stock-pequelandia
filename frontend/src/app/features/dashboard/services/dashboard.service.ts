import {
  Injectable,
  inject
} from '@angular/core';

import {
  HttpClient,
  HttpHeaders
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

export interface ResumenDashboard {
  total_vendido_hoy: number;
  ventas_realizadas_hoy: number;
  productos_vendidos_hoy: number;
  productos_stock_bajo: number;
  productos_agotados: number;
  alertas_stock: number;
}

export interface MetaDiariaDashboard {
  meta: number;
  vendido_hoy: number;
  porcentaje: number;
  cumplida: boolean;
}

export interface VentaSemanaDashboard {
  fecha: string;
  dia: string;
  total_vendido: number;
  numero_ventas: number;
}

export interface StockCriticoDashboard {
  id_producto: number;
  codigo_producto: string;
  nombre_producto: string;
  stock_producto: number;
  stock_minimo_producto: number;
  porcentaje_stock: number;
  estado_stock:
    | 'BAJO'
    | 'AGOTADO';
}

export interface UltimaVentaDashboard {
  id_venta: number;
  numero_venta: string;
  numero_comprobante: string;
  fecha: string;
  hora: string;
  productos: string;
  cantidad_productos: number;
  usuario: string;
  total: number;
  estado: string;
  anulada: boolean;
}

export interface Dashboard {
  fecha: string;
  inicio_semana: string;
  fin_semana: string;
  rol_usuario: string;
  es_administrador: boolean;
  resumen: ResumenDashboard;
  meta_diaria: MetaDiariaDashboard;
  ventas_semana: VentaSemanaDashboard[];
  stock_critico: StockCriticoDashboard[];
  ultimas_ventas: UltimaVentaDashboard[];
}

export interface DashboardResponse {
  ok: boolean;
  mensaje: string;
  dashboard: Dashboard;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private readonly http =
    inject(HttpClient);

  private readonly authService =
    inject(AuthService);

  private readonly apiUrl =
    `${environment.apiUrl}/dashboard`;

  obtenerDashboard():
    Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(
      this.apiUrl,
      {
        headers:
          this.obtenerHeadersAutenticacion()
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