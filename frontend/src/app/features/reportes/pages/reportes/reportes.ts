import {
  ChangeDetectorRef,
  Component,
  inject
} from '@angular/core';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  MatTabsModule
} from '@angular/material/tabs';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatProgressSpinnerModule
} from '@angular/material/progress-spinner';

import {
  finalize
} from 'rxjs';

import {
  ReporteDiarioComponent
} from '../../components/reporte-diario/reporte-diario';

import {
  ReporteMensualComponent
} from '../../components/reporte-mensual/reporte-mensual';

import {
  ReporteSemanalComponent
} from '../../components/reporte-semanal/reporte-semanal';

import {
  ReporteService,
  ResumenInventarioReporte
} from '../../services/reporte.service';

type VistaReportes =
  'ventas'
  | 'inventario';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReporteDiarioComponent,
    ReporteSemanalComponent,
    ReporteMensualComponent
  ],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class ReportesComponent {

  private readonly reporteService =
    inject(ReporteService);

  private readonly changeDetectorRef =
    inject(ChangeDetectorRef);

  vistaActiva:
    VistaReportes =
      'ventas';

  inventarioInicializado =
    false;

  resumenInventario:
    ResumenInventarioReporte | null =
      null;

  cargandoInventario =
    false;

  errorInventario =
    false;

  mensajeErrorInventario =
    'No se pudo cargar la valorización del inventario.';

  seleccionarVista(
    vista: VistaReportes
  ): void {

    this.vistaActiva =
      vista;

    if (
      vista !== 'inventario'
    ) {

      return;

    }

    this.inventarioInicializado =
      true;

    if (
      !this.resumenInventario
      && !this.cargandoInventario
    ) {

      this.cargarResumenInventario();

    }

  }

  cargarResumenInventario(): void {

    if (this.cargandoInventario) {

      return;

    }

    this.inventarioInicializado =
      true;

    this.cargandoInventario =
      true;

    this.errorInventario =
      false;

    this.mensajeErrorInventario =
      'No se pudo cargar la valorización del inventario.';

    this.reporteService
      .obtenerResumenInventario()
      .pipe(
        finalize(() => {

          this.cargandoInventario =
            false;

          this.changeDetectorRef
            .detectChanges();

        })
      )
      .subscribe({

        next: (response) => {

          this.resumenInventario = {
            ...response.reporte,

            ranking_productos:
              response
                .reporte
                .ranking_productos
              ?? []
          };

          this.errorInventario =
            false;

          this.changeDetectorRef
            .detectChanges();

        },

        error: (
          error: HttpErrorResponse
        ) => {

          console.error(
            'Error al obtener la valorización del inventario:',
            error
          );

          this.errorInventario =
            true;

          this.mensajeErrorInventario =
            this.obtenerMensajeError(
              error
            );

          this.changeDetectorRef
            .detectChanges();

        }

      });

  }

  formatearMoneda(
    valor: number
  ): string {

    return new Intl.NumberFormat(
      'es-PE',
      {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
      }
    ).format(
      Number(valor ?? 0)
    );

  }

  formatearFechaCalculo(
    fecha: string
  ): string {

    if (!fecha) {

      return 'Sin fecha disponible';

    }

    const fechaNormalizada =
      fecha.replace(
        ' ',
        'T'
      );

    const fechaConvertida =
      new Date(
        fechaNormalizada
      );

    if (
      Number.isNaN(
        fechaConvertida.getTime()
      )
    ) {

      return fecha;

    }

    return new Intl.DateTimeFormat(
      'es-PE',
      {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    ).format(
      fechaConvertida
    );

  }

  esProductoActivo(
    estado: string
  ): boolean {

    return estado
      .trim()
      .toUpperCase()
      === 'ACTIVO';

  }

  obtenerClasePuesto(
    puesto: number
  ): string {

    if (puesto === 1) {

      return 'primer-puesto';

    }

    if (puesto === 2) {

      return 'segundo-puesto';

    }

    if (puesto === 3) {

      return 'tercer-puesto';

    }

    return '';

  }

  private obtenerMensajeError(
    error: HttpErrorResponse
  ): string {

    const mensajeBackend =
      error.error?.mensaje;

    if (
      typeof mensajeBackend === 'string'
      && mensajeBackend.trim() !== ''
    ) {

      return mensajeBackend;

    }

    if (error.status === 0) {

      return 'No se pudo conectar con Laravel. Verifica que el servidor esté encendido.';

    }

    if (error.status === 401) {

      return 'La sesión ha vencido. Vuelve a iniciar sesión.';

    }

    if (error.status === 403) {

      return 'No tienes permiso para consultar esta información.';

    }

    return 'Ocurrió un error al cargar la valorización del inventario.';

  }

}