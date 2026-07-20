import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface DetalleVentaRequest {
    id_producto: number;
    cantidad: number;
}

export interface RegistrarVentaRequest {
    detalles: DetalleVentaRequest[];
}

export interface RegistrarVentaResponse {
    ok: boolean;
    mensaje: string;
    venta: any;
}

@Injectable({
    providedIn: 'root'
})
export class VentaService {

    private http = inject(HttpClient);

    private apiUrl = `${environment.apiUrl}/ventas`;

    registrar(
        datos: RegistrarVentaRequest
    ): Observable<RegistrarVentaResponse> {

        return this.http.post<RegistrarVentaResponse>(
            this.apiUrl,
            datos
        );

    }

}