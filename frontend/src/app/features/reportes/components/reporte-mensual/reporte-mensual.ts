import { CommonModule } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    OnInit,
    inject
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
    MatProgressSpinnerModule
} from '@angular/material/progress-spinner';
import {
    MatSnackBar,
    MatSnackBarModule
} from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import {
    MejorDiaReporte,
    ProductoMasVendidoReporte,
    ReporteService,
    UltimaVentaReporte,
    VentaPorDiaReporte,
    VentaPorUsuarioReporte
} from '../../services/reporte.service';

@Component({
    selector: 'app-reporte-mensual',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatTableModule
    ],
    templateUrl: './reporte-mensual.html',
    styleUrl: './reporte-mensual.scss'
})
export class ReporteMensualComponent implements OnInit {

    private readonly reporteService =
        inject(ReporteService);

    private readonly snackBar =
        inject(MatSnackBar);

    private readonly changeDetectorRef =
        inject(ChangeDetectorRef);

    mesSeleccionado = '';

    mesMaximo = '';

    inicioMes = '';

    finMes = '';

    nombreMes = '';

    anio = 0;

    cantidadDiasMes = 0;

    totalVendido = 0;

    costoEstimado = 0;

    gananciaEstimada = 0;

    ventasRealizadas = 0;

    productosVendidos = 0;

    ticketPromedio = 0;

    metaDiaria = 100;

    metaMensual = 0;

    porcentajeMeta = 0;

    metaCumplida = false;

    diasMetaCumplida = 0;

    mejorDia:
        MejorDiaReporte | null = null;

    productoMasVendido:
        ProductoMasVendidoReporte | null = null;

    ventasPorUsuario:
        VentaPorUsuarioReporte[] = [];

    ventasPorDia:
        VentaPorDiaReporte[] = [];

    ultimasVentas:
        UltimaVentaReporte[] = [];

    cargando = false;

    columnasDias: string[] = [
        'numeroDia',
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
        'total'
    ];

    ngOnInit(): void {

        const mesActualPeru =
            this.obtenerMesActualPeru();

        this.mesSeleccionado =
            mesActualPeru;

        this.mesMaximo =
            mesActualPeru;

        this.cargarReporteMensual();
    }

    cambiarMes(): void {

        if (
            !this.mesSeleccionado
            || this.cargando
        ) {
            return;
        }

        if (
            this.mesSeleccionado
            > this.mesMaximo
        ) {
            this.mesSeleccionado =
                this.mesMaximo;

            this.mostrarMensaje(
                'No se pueden consultar meses futuros.'
            );

            return;
        }

        this.cargarReporteMensual();
    }

    cargarReporteMensual(): void {

        if (
            !this.mesSeleccionado
            || this.cargando
        ) {
            return;
        }

        const fechaConsulta =
            `${this.mesSeleccionado}-01`;

        this.cargando = true;

        this.changeDetectorRef
            .detectChanges();

        this.reporteService
            .obtenerReporteMensual(
                fechaConsulta
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

                    this.inicioMes =
                        reporte.inicio_mes;

                    this.finMes =
                        reporte.fin_mes;

                    this.nombreMes =
                        reporte.nombre_mes;

                    this.anio =
                        reporte.anio;

                    this.cantidadDiasMes =
                        reporte.cantidad_dias_mes;

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

                    this.metaMensual =
                        reporte.meta_mensual;

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

                    this.changeDetectorRef
                        .detectChanges();
                },
                error: error => {

                    this.limpiarReporte();

                    const mensaje =
                        error?.error?.mensaje
                        ?? 'No se pudo cargar el reporte mensual.';

                    this.mostrarMensaje(
                        mensaje
                    );

                    this.changeDetectorRef
                        .detectChanges();
                }
            });
    }

    verVenta(
        idVenta: number
    ): void {

        console.log(
            'Venta seleccionada:',
            idVenta
        );
    }

    private limpiarReporte(): void {

        this.inicioMes = '';

        this.finMes = '';

        this.nombreMes = '';

        this.anio = 0;

        this.cantidadDiasMes = 0;

        this.totalVendido = 0;

        this.costoEstimado = 0;

        this.gananciaEstimada = 0;

        this.ventasRealizadas = 0;

        this.productosVendidos = 0;

        this.ticketPromedio = 0;

        this.metaMensual = 0;

        this.porcentajeMeta = 0;

        this.metaCumplida = false;

        this.diasMetaCumplida = 0;

        this.mejorDia = null;

        this.productoMasVendido = null;

        this.ventasPorUsuario = [];

        this.ventasPorDia = [];

        this.ultimasVentas = [];
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

    private obtenerMesActualPeru(): string {

        const partes =
            new Intl.DateTimeFormat(
                'en-CA',
                {
                    timeZone: 'America/Lima',
                    year: 'numeric',
                    month: '2-digit'
                }
            ).formatToParts(
                new Date()
            );

        const anio =
            partes.find(
                parte =>
                    parte.type === 'year'
            )?.value ?? '';

        const mes =
            partes.find(
                parte =>
                    parte.type === 'month'
            )?.value ?? '';

        return `${anio}-${mes}`;
    }
}