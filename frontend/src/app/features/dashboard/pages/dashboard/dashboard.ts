import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router
} from '@angular/router';

import {
  finalize
} from 'rxjs';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatCardModule
} from '@angular/material/card';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatProgressSpinnerModule
} from '@angular/material/progress-spinner';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  AuthService
} from '../../../../core/services/auth.service';

import {
  GraficoVentasComponent,
  PuntoGraficoVentas
} from '../../../reportes/components/grafico-ventas/grafico-ventas';

import {
  Dashboard,
  DashboardService,
  StockCriticoDashboard
} from '../../services/dashboard.service';

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  administrador: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    GraficoVentasComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent
implements OnInit, OnDestroy {

  private readonly dashboardService =
    inject(DashboardService);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly snackBar =
    inject(MatSnackBar);

  private readonly changeDetectorRef =
    inject(ChangeDetectorRef);

  private temporizadorActualizacion:
    ReturnType<typeof setInterval>
    | null = null;

  private componenteDestruido =
    false;

  dashboard:
    Dashboard | null = null;

  datosGrafico:
    PuntoGraficoVentas[] = [];

  cargando = false;

  actualizando = false;

  mensajeError = '';

  ultimaActualizacion:
    Date | null = null;

  private readonly accesos:
    AccesoRapido[] = [
      {
        titulo:
          'Nueva venta',

        descripcion:
          'Registrar una venta',

        icono:
          'point_of_sale',

        ruta:
          '/ventas',

        administrador:
          false
      },
      {
        titulo:
          'Inventario',

        descripcion:
          'Consultar productos y stock',

        icono:
          'inventory_2',

        ruta:
          '/inventario',

        administrador:
          false
      },
      {
        titulo:
          'Reportes',

        descripcion:
          'Revisar resultados del negocio',

        icono:
          'bar_chart',

        ruta:
          '/reportes',

        administrador:
          true
      },
      {
        titulo:
          'Usuarios',

        descripcion:
          'Administrar cuentas',

        icono:
          'manage_accounts',

        ruta:
          '/usuarios',

        administrador:
          true
      }
    ];

  ngOnInit(): void {
    this.cargarDashboard(
      true
    );

    this.temporizadorActualizacion =
      setInterval(
        () => {
          this.cargarDashboard(
            false,
            false
          );
        },
        60000
      );
  }

  ngOnDestroy(): void {
    this.componenteDestruido =
      true;

    if (
      this.temporizadorActualizacion
    ) {
      clearInterval(
        this.temporizadorActualizacion
      );

      this.temporizadorActualizacion =
        null;
    }
  }

  get esAdministrador(): boolean {
    return this.authService
      .esAdministrador();
  }

  get nombreUsuario(): string {
    const usuario =
      this.authService
        .getUsuario() as any;

    const personal =
      usuario?.personal;

    const nombreCompleto = [
      personal?.nombre_personal,
      personal?.apellido_personal
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return nombreCompleto
      || usuario?.nombre_usuario
      || 'Usuario';
  }

  get accesosVisibles():
    AccesoRapido[] {
    return this.accesos.filter(
      acceso =>
        !acceso.administrador
        || this.esAdministrador
    );
  }

  get porcentajeMetaVisual(): number {
    const porcentaje =
      Number(
        this.dashboard
          ?.meta_diaria
          .porcentaje
        ?? 0
      );

    return Math.min(
      Math.max(
        porcentaje,
        0
      ),
      100
    );
  }

  get ultimaActualizacionTexto():
    string {
    if (!this.ultimaActualizacion) {
      return '';
    }

    return new Intl.DateTimeFormat(
      'es-PE',
      {
        timeZone:
          'America/Lima',

        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit'
      }
    ).format(
      this.ultimaActualizacion
    );
  }

  get rangoSemanaTexto(): string {
    if (
      !this.dashboard
        ?.inicio_semana
      || !this.dashboard
        ?.fin_semana
    ) {
      return '';
    }

    return (
      `${this.formatearFechaCorta(
        this.dashboard.inicio_semana
      )} al ${this.formatearFechaCorta(
        this.dashboard.fin_semana
      )}`
    );
  }

  actualizarDashboard(): void {
    this.cargarDashboard(
      false,
      true
    );
  }

  irA(
    ruta: string
  ): void {
    this.router.navigate([
      ruta
    ]);
  }

  obtenerClaseStock(
    producto: StockCriticoDashboard
  ): string {
    return producto.estado_stock
      === 'AGOTADO'
        ? 'agotado'
        : 'bajo';
  }

  obtenerTextoStock(
    producto: StockCriticoDashboard
  ): string {
    if (
      producto.estado_stock
      === 'AGOTADO'
    ) {
      return 'Agotado';
    }

    return (
      `${producto.stock_producto} unidades`
    );
  }

  private cargarDashboard(
    cargaInicial = false,
    mostrarMensajeError = false
  ): void {
    if (
      this.cargando
      || this.actualizando
    ) {
      return;
    }

    if (cargaInicial) {
      this.cargando = true;
    } else {
      this.actualizando = true;
    }

    this.mensajeError = '';

    this.actualizarVista();

    this.dashboardService
      .obtenerDashboard()
      .pipe(
        finalize(() => {
          this.cargando = false;

          this.actualizando = false;

          this.actualizarVista();
        })
      )
      .subscribe({
        next: response => {
          this.dashboard =
            response.dashboard;

          this.datosGrafico =
            response.dashboard
              .ventas_semana
              .map(
                item => ({
                  etiqueta:
                    this.capitalizar(
                      item.dia.substring(
                        0,
                        3
                      )
                    ),

                  valor:
                    Number(
                      item.total_vendido
                    ),

                  detalle:
                    `${item.numero_ventas} ventas`
                })
              );

          this.ultimaActualizacion =
            new Date();

          this.mensajeError = '';

          this.actualizarVista();
        },

        error: error => {
          const mensaje =
            error?.error?.mensaje
            ?? 'No se pudo cargar el dashboard.';

          if (!this.dashboard) {
            this.mensajeError =
              mensaje;
          }

          if (mostrarMensajeError) {
            this.snackBar.open(
              mensaje,
              'Cerrar',
              {
                duration:
                  5000,

                horizontalPosition:
                  'right',

                verticalPosition:
                  'bottom'
              }
            );
          }

          this.actualizarVista();
        }
      });
  }

  private actualizarVista(): void {
    if (
      this.componenteDestruido
    ) {
      return;
    }

    this.changeDetectorRef
      .detectChanges();
  }

  private formatearFechaCorta(
    fecha: string
  ): string {
    const fechaLocal =
      new Date(
        `${fecha}T00:00:00`
      );

    return new Intl.DateTimeFormat(
      'es-PE',
      {
        day:
          '2-digit',

        month:
          '2-digit'
      }
    ).format(
      fechaLocal
    );
  }

  private capitalizar(
    texto: string
  ): string {
    if (!texto) {
      return '';
    }

    return (
      texto.charAt(0)
        .toUpperCase()
      + texto.slice(1)
        .toLowerCase()
    );
  }

}