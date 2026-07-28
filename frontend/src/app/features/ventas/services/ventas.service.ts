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

import {
  AnularVentaResponse,
  BuscarVentaResponse,
  ConsultaDniResponse,
  ConsultaRucResponse,
  RegistrarVentaRequest,
  RegistrarVentaResponse
} from '../interfaces/comprobante-venta.interface';

@Injectable({
  providedIn: 'root'
})
export class VentaService {

  private readonly http =
    inject(HttpClient);

  private readonly authService =
    inject(AuthService);

  private readonly apiUrl =
    `${environment.apiUrl}/ventas`;

  private readonly consultasUrl =
    `${environment.apiUrl}/consultas`;

  registrar(
    datos: RegistrarVentaRequest
  ): Observable<RegistrarVentaResponse> {

    return this.http.post<RegistrarVentaResponse>(
      this.apiUrl,
      datos,
      {
        headers:
          this.obtenerHeadersAutenticacion()
      }
    );

  }

  buscarPorComprobante(
    numeroComprobante: string
  ): Observable<BuscarVentaResponse> {

    const numero = encodeURIComponent(
      numeroComprobante
        .trim()
        .toUpperCase()
    );

    return this.http.get<BuscarVentaResponse>(
      `${this.apiUrl}/comprobante/${numero}`,
      {
        headers:
          this.obtenerHeadersAutenticacion()
      }
    );

  }

  anularPorComprobante(
    numeroComprobante: string
  ): Observable<AnularVentaResponse> {

    const numero = encodeURIComponent(
      numeroComprobante
        .trim()
        .toUpperCase()
    );

    return this.http.patch<AnularVentaResponse>(
      `${this.apiUrl}/comprobante/${numero}/anular`,
      {},
      {
        headers:
          this.obtenerHeadersAutenticacion()
      }
    );

  }

  consultarDni(
    dni: string
  ): Observable<ConsultaDniResponse> {

    return this.http.get<ConsultaDniResponse>(
      `${this.consultasUrl}/dni/${dni}`,
      {
        headers:
          this.obtenerHeadersAutenticacion()
      }
    );

  }

  consultarRuc(
    ruc: string
  ): Observable<ConsultaRucResponse> {

    return this.http.get<ConsultaRucResponse>(
      `${this.consultasUrl}/ruc/${ruc}`,
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

    const headers: Record<string, string> = {
      'Content-Type':
        'application/json',
      'Accept':
        'application/json'
    };

    if (token) {
      headers['Authorization'] =
        `Bearer ${token}`;
    }

    return new HttpHeaders(headers);

  }

}