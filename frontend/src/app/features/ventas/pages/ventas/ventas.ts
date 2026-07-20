import {
    ChangeDetectorRef,
    Component,
    inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ProductoService } from '../../../inventario/services/producto';
import { VentaService } from '../../services/ventas.service';

@Component({
    selector: 'app-ventas',

    standalone: true,

    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule,
        MatSnackBarModule
    ],

    templateUrl: './ventas.html',
    styleUrl: './ventas.scss'
})
export class Ventas {

    private productoService = inject(ProductoService);

    private ventaService = inject(VentaService);

    private snackBar = inject(MatSnackBar);

    private cdr = inject(ChangeDetectorRef);

    displayedColumns: string[] = [
        'producto',
        'cantidad',
        'precio',
        'subtotal',
        'acciones'
    ];

    ventas: any[] = [];

    codigoBarras = '';

    subtotal = 0;

    igv = 0;

    total = 0;

    registrando = false;

    agregarProducto(): void {

        const codigo = this.codigoBarras.trim();

        if (!codigo) {

            return;

        }

        this.productoService.buscarPorCodigo(codigo).subscribe({

            next: (respuesta: any) => {

                const producto = respuesta.data;

                if (!producto) {

                    this.mostrarMensaje(
                        'Producto no encontrado.'
                    );

                    this.codigoBarras = '';

                    return;

                }

                const existente = this.ventas.find(

                    item =>
                        item.id_producto ===
                        producto.id_producto

                );

                if (existente) {

                    existente.cantidad++;

                    existente.subtotal =
                        existente.cantidad *
                        Number(existente.precio);

                } else {

                    this.ventas.push({

                        id_producto:
                            producto.id_producto,

                        producto:
                            producto.nombre_producto,

                        cantidad: 1,

                        precio:
                            Number(
                                producto.precio_producto
                            ),

                        subtotal:
                            Number(
                                producto.precio_producto
                            )

                    });

                }

                this.ventas = [...this.ventas];

                this.calcularTotales();

                this.codigoBarras = '';

                this.cdr.detectChanges();

            },

            error: (error: any) => {

                const mensaje =
                    error?.error?.mensaje ??
                    'Producto no encontrado.';

                this.mostrarMensaje(mensaje);

                this.codigoBarras = '';

            }

        });

    }

    aumentarCantidad(producto: any): void {

        producto.cantidad++;

        producto.subtotal =
            producto.cantidad *
            Number(producto.precio);

        this.ventas = [...this.ventas];

        this.calcularTotales();

    }

    disminuirCantidad(producto: any): void {

        if (producto.cantidad > 1) {

            producto.cantidad--;

            producto.subtotal =
                producto.cantidad *
                Number(producto.precio);

        } else {

            this.eliminarProducto(producto);

            return;

        }

        this.ventas = [...this.ventas];

        this.calcularTotales();

    }

    eliminarProducto(producto: any): void {

        this.ventas = this.ventas.filter(

            item =>
                item.id_producto !==
                producto.id_producto

        );

        this.calcularTotales();

    }

    limpiarVenta(): void {

        if (this.registrando) {

            return;

        }

        this.ventas = [];

        this.codigoBarras = '';

        this.calcularTotales();

    }

    registrarVenta(): void {

        if (this.registrando) {

            return;

        }

        if (this.ventas.length === 0) {

            this.mostrarMensaje(
                'Debe agregar al menos un producto.'
            );

            return;

        }

        const datos = {

            detalles: this.ventas.map(

                producto => ({

                    id_producto:
                        producto.id_producto,

                    cantidad:
                        producto.cantidad

                })

            )

        };

        this.registrando = true;

        this.ventaService.registrar(datos).subscribe({

            next: (respuesta) => {

                this.registrando = false;

                this.mostrarMensaje(

                    respuesta.mensaje ||
                    'Venta registrada correctamente.'

                );

                this.limpiarVenta();

                this.cdr.detectChanges();

            },

            error: (error: any) => {

                this.registrando = false;

                const mensaje =
                    error?.error?.mensaje ??
                    error?.error?.message ??
                    'No se pudo completar la venta. Intente nuevamente.';

                this.mostrarMensaje(mensaje);

                this.cdr.detectChanges();

            }

        });

    }

    calcularTotales(): void {

        this.subtotal = this.ventas.reduce(

            (total, item) =>
                total +
                Number(item.subtotal),

            0

        );

        this.igv = 0;

        this.total = this.subtotal;

    }

    private mostrarMensaje(
        mensaje: string
    ): void {

        this.snackBar.open(

            mensaje,

            'Cerrar',

            {
                duration: 5000,
                horizontalPosition: 'right',
                verticalPosition: 'bottom'
            }

        );

    }

}