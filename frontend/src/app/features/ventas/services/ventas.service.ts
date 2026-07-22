import { inject, Injectable } from '@angular/core';
import {
    HttpClient,
    HttpHeaders
} from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export type TipoComprobante =
    | 'VENTA RAPIDA'
    | 'BOLETA'
    | 'FACTURA';

export interface DetalleVentaRequest {
    id_producto: number;
    cantidad: number;
}

export interface RegistrarVentaRequest {
    tipo_comprobante: TipoComprobante;
    numero_documento: string | null;
    detalles: DetalleVentaRequest[];
}

export interface RegistrarVentaResponse {
    ok: boolean;
    mensaje: string;
    venta: any;
}

export interface DatosDni {
    success: boolean;
    dni: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    codVerifica?: number;
    codVerificaLetra?: string;
}

export interface DatosRuc {
    ruc: string;
    razonSocial: string;
    nombreComercial?: string | null;
    estado: string;
    condicion: string;
    direccion: string;
    departamento?: string;
    provincia?: string;
    distrito?: string;
    ubigeo?: string;
}

export interface ConsultaDniResponse {
    mensaje: string;
    datos: DatosDni;
}

export interface ConsultaRucResponse {
    mensaje: string;
    datos: DatosRuc;
}

@Injectable({
    providedIn: 'root'
})
export class VentaService {

    private http = inject(HttpClient);

    private authService = inject(AuthService);

    private apiUrl =
        `${environment.apiUrl}/ventas`;

    private consultasUrl =
        `${environment.apiUrl}/consultas`;

    registrar(
        datos: RegistrarVentaRequest
    ): Observable<RegistrarVentaResponse> {

        const headers = this.obtenerHeadersAutenticacion();

        return this.http.post<RegistrarVentaResponse>(
            this.apiUrl,
            datos,
            {
                headers
            }
        );
    }

    consultarDni(
        dni: string
    ): Observable<ConsultaDniResponse> {

        return this.http.get<ConsultaDniResponse>(
            `${this.consultasUrl}/dni/${dni}`
        );
    }

    consultarRuc(
        ruc: string
    ): Observable<ConsultaRucResponse> {

        return this.http.get<ConsultaRucResponse>(
            `${this.consultasUrl}/ruc/${ruc}`
        );
    }

    private obtenerHeadersAutenticacion(): HttpHeaders {

        const token = this.authService.getToken();

        if (!token) {
            return new HttpHeaders({
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            });
        }

        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }
}