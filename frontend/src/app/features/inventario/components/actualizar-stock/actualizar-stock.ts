import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatRadioModule
} from '@angular/material/radio';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  finalize
} from 'rxjs';

import {
  Producto
} from '../../interfaces/producto.interface';

import {
  OperacionStock,
  ProductoService
} from '../../services/producto';

@Component({
  selector: 'app-actualizar-stock',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSnackBarModule
  ],
  templateUrl: './actualizar-stock.html',
  styleUrl: './actualizar-stock.scss'
})
export class ActualizarStockComponent
implements OnChanges {

  @Input({
    required: true
  })
  producto!: Producto;

  @Output()
  cerrar =
    new EventEmitter<void>();

  @Output()
  stockActualizado =
    new EventEmitter<Producto>();

  private fb =
    inject(FormBuilder);

  private productoService =
    inject(ProductoService);

  private snackBar =
    inject(MatSnackBar);

  guardando = false;

  formulario =
    this.fb.nonNullable.group({

      operacion: [
        'agregar' as OperacionStock,
        Validators.required
      ],

      cantidad: [
        1,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^\d+$/)
        ]
      ]

    });

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['producto']
      && this.producto
    ) {

      this.formulario.reset({

        operacion:
          'agregar',

        cantidad:
          1

      });

    }

  }

  get operacionSeleccionada():
    OperacionStock {

    return this.formulario
      .controls
      .operacion
      .value;

  }

  get cantidadIngresada(): number {

    return Number(
      this.formulario
        .controls
        .cantidad
        .value
      ?? 0
    );

  }

  get stockActual(): number {

    return Number(
      this.producto
        ?.stock_producto
      ?? 0
    );

  }

  get stockResultante(): number {

    const cantidad =
      this.cantidadIngresada;

    switch (
      this.operacionSeleccionada
    ) {

      case 'agregar':

        return (
          this.stockActual
          + cantidad
        );

      case 'retirar':

        return (
          this.stockActual
          - cantidad
        );

      case 'establecer':

        return cantidad;

      default:

        return this.stockActual;

    }

  }

  get retiroInvalido(): boolean {

    return (
      this.operacionSeleccionada
        === 'retirar'
      && this.cantidadIngresada
        > this.stockActual
    );

  }

  get cantidadDebeSerMayorCero():
    boolean {

    return (
      (
        this.operacionSeleccionada
          === 'agregar'
        || this.operacionSeleccionada
          === 'retirar'
      )
      && this.cantidadIngresada
        <= 0
    );

  }

  get formularioValido():
    boolean {

    return (
      this.formulario.valid
      && !this.retiroInvalido
      && !this.cantidadDebeSerMayorCero
      && !this.guardando
    );

  }

  seleccionarOperacion(
    operacion: OperacionStock
  ): void {

    if (this.guardando) {

      return;

    }

    this.formulario
      .controls
      .operacion
      .setValue(
        operacion
      );

    if (
      operacion !== 'establecer'
      && this.cantidadIngresada
        === 0
    ) {

      this.formulario
        .controls
        .cantidad
        .setValue(
          1
        );

    }

  }

  cerrarComponente(): void {

    if (this.guardando) {

      return;

    }

    this.cerrar.emit();

  }

  guardar(): void {

    if (this.guardando) {

      return;

    }

    if (
      this.formulario.invalid
      || this.retiroInvalido
      || this.cantidadDebeSerMayorCero
    ) {

      this.formulario
        .markAllAsTouched();

      this.mostrarMensaje(
        this.obtenerMensajeValidacion()
      );

      return;

    }

    if (
      !this.producto.id_producto
    ) {

      this.mostrarMensaje(
        'No se pudo identificar el producto.'
      );

      return;

    }

    const datos = {

      operacion:
        this.operacionSeleccionada,

      cantidad:
        this.cantidadIngresada

    };

    this.guardando = true;

    this.productoService
      .actualizarStock(
        this.producto.id_producto,
        datos
      )
      .pipe(
        finalize(() => {

          this.guardando = false;

        })
      )
      .subscribe({

        next: (response) => {

          this.mostrarMensaje(
            response.mensaje
            ?? 'Stock actualizado correctamente.'
          );

          this.stockActualizado.emit(
            response.data
          );

        },

        error: (error) => {

          console.error(
            'Error al actualizar stock:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error
            )
          );

        }

      });

  }

  obtenerTextoOperacion(): string {

    switch (
      this.operacionSeleccionada
    ) {

      case 'agregar':

        return 'Se agregará al stock actual';

      case 'retirar':

        return 'Se retirará del stock actual';

      case 'establecer':

        return 'El stock será reemplazado';

      default:

        return '';

    }

  }

  private obtenerMensajeValidacion():
    string {

    if (this.retiroInvalido) {

      return (
        'No puede retirar una cantidad mayor al stock actual.'
      );

    }

    if (
      this.cantidadDebeSerMayorCero
    ) {

      return (
        'La cantidad debe ser mayor que cero.'
      );

    }

    return (
      'Ingrese una cantidad válida.'
    );

  }

  private obtenerMensajeError(
    error: any
  ): string {

    const errores =
      error?.error?.errors;

    if (
      errores
      && typeof errores
        === 'object'
    ) {

      const primerError =
        Object.values(
          errores
        )[0];

      if (
        Array.isArray(primerError)
        && primerError.length > 0
      ) {

        return String(
          primerError[0]
        );

      }

    }

    return (
      error?.error?.mensaje
      ?? error?.error?.message
      ?? 'No se pudo actualizar el stock.'
    );

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

}