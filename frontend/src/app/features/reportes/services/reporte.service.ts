import { inject, Injectable } from '@angular/core';
import {
    HttpClient,
    HttpHeaders,
    HttpParams
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

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
    hora: string;
    productos: string;
    usuario: string;
    total: number;
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
    producto_mas_vendido: ProductoMasVendidoReporte | null;
    ventas_por_usuario: VentaPorUsuarioReporte[];
    ultimas_ventas: UltimaVentaReporte[];
}

export interface ReporteDiarioResponse {
    ok: boolean;
    mensaje: string;
    reporte: ReporteDiario;
}

@Injectable({
    providedIn: 'root'
})
export class ReporteService {

    private http = inject(HttpClient);

    private authService = inject(AuthService);

    private apiUrl =
        `${environment.apiUrl}/reportes`;

    obtenerReporteDiario(
        fecha: string
    ): Observable<ReporteDiarioResponse> {

        const headers =
            this.obtenerHeadersAutenticacion();

        const params = new HttpParams()
            .set('fecha', fecha);

        return this.http.get<ReporteDiarioResponse>(
            `${this.apiUrl}/diario`,
            {
                headers,
                params
            }
        );
    }

    private obtenerHeadersAutenticacion(): HttpHeaders {

        const token = this.authService.getToken();

        if (!token) {
            return new HttpHeaders({
                'Accept': 'application/json'
            });
        }

        return new HttpHeaders({
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }
}