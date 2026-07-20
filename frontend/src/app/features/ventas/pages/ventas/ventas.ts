import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

import { ProductoService } from '../../../inventario/services/producto';

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
        MatTableModule
    ],
    templateUrl: './ventas.html',
    styleUrl: './ventas.scss'
})
export class Ventas {

    private productoService = inject(ProductoService);
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

    agregarProducto(): void {

        const codigo = this.codigoBarras.trim();

        if (!codigo) {
            return;
        }

        this.productoService.buscarPorCodigo(codigo).subscribe({

            next: (respuesta: any) => {

                const producto = respuesta.data;

                if (!producto) {
                    return;
                }

                const existente = this.ventas.find(
                    x => x.id_producto === producto.id_producto
                );

                if (existente) {

                    existente.cantidad++;

                    existente.subtotal =
                        existente.cantidad *
                        Number(existente.precio);

                } else {

                    this.ventas.push({

                        id_producto: producto.id_producto,

                        producto: producto.nombre_producto,

                        cantidad: 1,

                        precio: Number(producto.precio_producto),

                        subtotal: Number(producto.precio_producto)

                    });

                }

                this.ventas = [...this.ventas];

                this.calcularTotales();

                this.codigoBarras = '';

                this.cdr.detectChanges();

            },

            error: () => {

                alert('Producto no encontrado.');

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

            item => item.id_producto !== producto.id_producto

        );

        this.calcularTotales();

    }

    calcularTotales(): void {

        this.subtotal = this.ventas.reduce(

            (total, item) => total + Number(item.subtotal),

            0

        );

        this.igv = 0;

        this.total = this.subtotal;

    }

}