import {
    CommonModule
} from '@angular/common';

import {
    ChangeDetectorRef,
    Component,
    OnInit,
    inject
} from '@angular/core';

import {
    FormsModule
} from '@angular/forms';

import {
    finalize
} from 'rxjs';

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
    MatTableModule
} from '@angular/material/table';

import {
    DetalleVentaReporteComponent
} from '../detalle-venta-reporte/detalle-venta-reporte';

import {
    GraficoVentasComponent,
    PuntoGraficoVentas
} from '../grafico-ventas/grafico-ventas';

import {
    MejorDiaReporte,
    ProductoMasVendidoReporte,
    ReporteService,
    UltimaVentaReporte,
    VentaPorDiaReporte,
    VentaPorUsuarioReporte
} from '../../services/reporte.service';

@Component({
    selector: 'app-reporte-semanal',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTableModule,
        GraficoVentasComponent,
        DetalleVentaReporteComponent
    ],
    templateUrl: './reporte-semanal.html',
    styleUrl: './reporte-semanal.scss'
})
export class ReporteSemanalComponent
implements OnInit {

    private readonly reporteService =
        inject(ReporteService);

    private readonly snackBar =
        inject(MatSnackBar);

    private readonly changeDetectorRef =
        inject(ChangeDetectorRef);

    fechaSeleccionada = '';
    fechaMaxima = '';
    inicioSemana = '';
    finSemana = '';

    totalVendido = 0;
    costoEstimado = 0;
    gananciaEstimada = 0;
    ventasRealizadas = 0;
    productosVendidos = 0;
    ticketPromedio = 0;

    metaDiaria = 100;
    metaSemanal = 700;
    porcentajeMeta = 0;
    metaCumplida = false;
    diasMetaCumplida = 0;

    mejorDia:
        MejorDiaReporte | null =
            null;

    productoMasVendido:
        ProductoMasVendidoReporte | null =
            null;

    ventasPorUsuario:
        VentaPorUsuarioReporte[] = [];

    ventasPorDia:
        VentaPorDiaReporte[] = [];

    ultimasVentas:
        UltimaVentaReporte[] = [];

    datosGrafico:
        PuntoGraficoVentas[] = [];

    ventaSeleccionada:
        UltimaVentaReporte | null =
            null;

    cargando = false;

    columnasDias: string[] = [
        'dia',
        'fecha',
        'ventas',
        'productos',
        'total',
        'meta'
    ];

    columnasVentas: string[] = [
        'fecha',
        'hora',
        'venta',
        'productos',
        'usuario',
        'estado',
        'total'
    ];

    ngOnInit(): void {
        const fechaActualPeru =
            this.obtenerFechaActualPeru();

        this.fechaSeleccionada =
            fechaActualPeru;

        this.fechaMaxima =
            fechaActualPeru;

        this.cargarReporteSemanal();
    }

    cambiarFecha(): void {
        if (
            !this.fechaSeleccionada
            || this.cargando
        ) {
            return;
        }

        if (
            this.fechaSeleccionada
            > this.fechaMaxima
        ) {
            this.fechaSeleccionada =
                this.fechaMaxima;

            this.mostrarMensaje(
                'No se pueden consultar fechas futuras.'
            );

            return;
        }

        this.cargarReporteSemanal();
    }

    cargarReporteSemanal(): void {
        if (
            !this.fechaSeleccionada
            || this.cargando
        ) {
            return;
        }

        this.cargando = true;

        this.changeDetectorRef
            .detectChanges();

        this.reporteService
            .obtenerReporteSemanal(
                this.fechaSeleccionada
            )
            .pipe(
                finalize(() => {
                    this.cargando = false;

                    this.changeDetectorRef
                        .detectChanges();
                })
            )
            .subscribe({
                next: response => {
                    const reporte =
                        response.reporte;

                    this.inicioSemana =
                        reporte.inicio_semana;

                    this.finSemana =
                        reporte.fin_semana;

                    this.totalVendido =
                        reporte.total_vendido;

                    this.costoEstimado =
                        reporte.costo_estimado;

                    this.gananciaEstimada =
                        reporte.ganancia_estimada;

                    this.ventasRealizadas =
                        reporte.numero_ventas;

                    this.productosVendidos =
                        reporte.productos_vendidos;

                    this.ticketPromedio =
                        reporte.ticket_promedio;

                    this.metaDiaria =
                        reporte.meta_diaria;

                    this.metaSemanal =
                        reporte.meta_semanal;

                    this.porcentajeMeta =
                        reporte.porcentaje_meta;

                    this.metaCumplida =
                        reporte.meta_cumplida;

                    this.diasMetaCumplida =
                        reporte.dias_meta_cumplida;

                    this.mejorDia =
                        reporte.mejor_dia;

                    this.productoMasVendido =
                        reporte.producto_mas_vendido;

                    this.ventasPorUsuario =
                        reporte.ventas_por_usuario;

                    this.ventasPorDia =
                        reporte.ventas_por_dia;

                    this.ultimasVentas =
                        reporte.ultimas_ventas;

                    this.datosGrafico =
                        reporte.ventas_por_dia.map(
                            item => ({
                                etiqueta:
                                    item.dia.substring(
                                        0,
                                        3
                                    ),

                                valor:
                                    item.total_vendido,

                                detalle:
                                    `${item.numero_ventas} ventas`
                            })
                        );

                    this.ventaSeleccionada =
                        null;

                    this.changeDetectorRef
                        .detectChanges();
                },

                error: error => {
                    this.limpiarReporte();

                    const mensaje =
                        error?.error?.mensaje
                        ?? 'No se pudo cargar el reporte semanal.';

                    this.mostrarMensaje(
                        mensaje
                    );

                    this.changeDetectorRef
                        .detectChanges();
                }
            });
    }

    verVenta(
        venta: UltimaVentaReporte
    ): void {
        this.ventaSeleccionada =
            venta;
    }

    cerrarDetalleVenta(): void {
        this.ventaSeleccionada =
            null;
    }

    private limpiarReporte(): void {
        this.inicioSemana = '';
        this.finSemana = '';
        this.totalVendido = 0;
        this.costoEstimado = 0;
        this.gananciaEstimada = 0;
        this.ventasRealizadas = 0;
        this.productosVendidos = 0;
        this.ticketPromedio = 0;
        this.porcentajeMeta = 0;
        this.metaCumplida = false;
        this.diasMetaCumplida = 0;
        this.mejorDia = null;
        this.productoMasVendido = null;
        this.ventasPorUsuario = [];
        this.ventasPorDia = [];
        this.ultimasVentas = [];
        this.datosGrafico = [];
        this.ventaSeleccionada = null;
    }

    private mostrarMensaje(
        mensaje: string
    ): void {
        this.snackBar.open(
            mensaje,
            'Cerrar',
            {
                duration: 5000,
                horizontalPosition: 'end',
                verticalPosition: 'top'
            }
        );
    }

    private obtenerFechaActualPeru():
        string {
        return new Intl.DateTimeFormat(
            'en-CA',
            {
                timeZone:
                    'America/Lima',

                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit'
            }
        ).format(
            new Date()
        );
    }
}