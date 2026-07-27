import {
  Component,
  EventEmitter,
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
  MatButtonModule
} from '@angular/material/button';

import {
  MatMenuModule
} from '@angular/material/menu';

import {
  Producto
} from '../../interfaces/producto.interface';

@Component({
  selector: 'app-detalle-producto',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './detalle-producto.html',
  styleUrl: './detalle-producto.scss'
})
export class DetalleProductoComponent {

  @Input({
    required: true
  })
  producto!: Producto;

  @Input()
  esAdministrador = false;

  @Output()
  cerrar = new EventEmitter<void>();

  @Output()
  editar = new EventEmitter<Producto>();

  @Output()
  actualizarStock =
    new EventEmitter<Producto>();

  @Output()
  cambiarEstado =
    new EventEmitter<Producto>();

  @Output()
  generarEtiqueta =
    new EventEmitter<Producto>();

  cerrarDetalle(): void {

    this.cerrar.emit();

  }

  solicitarEdicion(): void {

    this.editar.emit(
      this.producto
    );

  }

  solicitarActualizacionStock(): void {

    this.actualizarStock.emit(
      this.producto
    );

  }

  solicitarCambioEstado(): void {

    this.cambiarEstado.emit(
      this.producto
    );

  }

  solicitarEtiqueta(): void {

    this.generarEtiqueta.emit(
      this.producto
    );

  }

  obtenerGananciaUnidad(): number {

    const precioVenta =
      Number(
        this.producto.precio_producto
        ?? 0
      );

    const precioCompra =
      Number(
        this.producto.costo_producto
        ?? 0
      );

    return (
      precioVenta
      - precioCompra
    );

  }

  obtenerTextoEstadoStock(): string {

    if (!this.producto.estado) {

      return 'Inactivo';

    }

    if (
      this.producto.stock_producto
      === 0
    ) {

      return 'Agotado';

    }

    if (
      this.producto
        .stock_minimo_producto > 0
      && this.producto
        .stock_producto
        <= this.producto
          .stock_minimo_producto
    ) {

      return 'Stock bajo';

    }

    return 'Disponible';

  }

  obtenerClaseEstadoStock(): string {

    if (!this.producto.estado) {

      return 'inactivo';

    }

    if (
      this.producto.stock_producto
      === 0
    ) {

      return 'agotado';

    }

    if (
      this.producto
        .stock_minimo_producto > 0
      && this.producto
        .stock_producto
        <= this.producto
          .stock_minimo_producto
    ) {

      return 'stock-bajo';

    }

    return 'disponible';

  }

  formatearPrecio(
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

  formatearFecha(
    fecha: string | null | undefined
  ): string {

    if (!fecha) {

      return 'No registrada';

    }

    const partes =
      fecha
        .substring(0, 10)
        .split('-');

    if (
      partes.length !== 3
    ) {

      return fecha;

    }

    return (
      `${partes[2]}/${partes[1]}/${partes[0]}`
    );

  }

}
