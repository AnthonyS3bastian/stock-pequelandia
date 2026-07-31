import {
  Component,
  OnInit,
  inject
} from '@angular/core';

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
export class ReportesComponent
implements OnInit {

  private readonly reporteService =
    inject(ReporteService);

  resumenInventario:
    ResumenInventarioReporte | null =
      null;

  cargandoInventario = false;

  errorInventario = false;

  ngOnInit(): void {

    this.cargarResumenInventario();

  }

  cargarResumenInventario(): void {

    if (this.cargandoInventario) {

      return;

    }

    this.cargandoInventario = true;

    this.errorInventario = false;

    this.reporteService
      .obtenerResumenInventario()
      .pipe(
        finalize(() => {

          this.cargandoInventario =
            false;

        })
      )
      .subscribe({

        next: (response) => {

          this.resumenInventario =
            response.reporte;

          this.errorInventario =
            false;

        },

        error: (error) => {

          console.error(
            'Error al obtener el resumen del inventario:',
            error
          );

          this.resumenInventario =
            null;

          this.errorInventario =
            true;

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

}