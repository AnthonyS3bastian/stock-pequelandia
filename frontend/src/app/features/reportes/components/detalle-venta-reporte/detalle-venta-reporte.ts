import {
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output
} from '@angular/core';

import {
    CommonModule
} from '@angular/common';

import {
    MatIconModule
} from '@angular/material/icon';

import {
    UltimaVentaReporte
} from '../../services/reporte.service';

@Component({
    selector: 'app-detalle-venta-reporte',
    standalone: true,
    imports: [
        CommonModule,
        MatIconModule
    ],
    templateUrl: './detalle-venta-reporte.html',
    styleUrl: './detalle-venta-reporte.scss'
})
export class DetalleVentaReporteComponent {

    @Input()
    venta:
        UltimaVentaReporte | null = null;

    @Output()
    cerrar =
        new EventEmitter<void>();

    get ventaAnulada(): boolean {
        return this.venta?.estado
            === 'ANULADA';
    }

    @HostListener(
        'document:keydown.escape'
    )
    cerrarConEscape(): void {
        if (this.venta) {
            this.cerrar.emit();
        }
    }

    cerrarModal(): void {
        this.cerrar.emit();
    }
}