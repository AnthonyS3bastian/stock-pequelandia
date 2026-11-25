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
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  finalize
} from 'rxjs';

import {
  CodigoBarraProducto,
  Producto
} from '../../interfaces/producto.interface';

import {
  AbastecimientoService,
  RegistrarAbastecimientoRequest
} from '../../services/abastecimiento';

@Component({
  selector: 'app-abastecer-productos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './abastecer-productos.html',
  styleUrl: './abastecer-productos.scss'
})
export class AbastecerProductosComponent
implements OnChanges {

  @Input()
  productos: Producto[] = [];

  @Input()
  productoInicial:
    Producto | null = null;

  @Output()
  cerrar =
    new EventEmitter<void>();

  @Output()
  crearProducto =
    new EventEmitter<void>();

  @Output()
  abastecimientoRegistrado =
    new EventEmitter<Producto>();

  private readonly fb =
    inject(FormBuilder);

  private readonly abastecimientoService =
    inject(AbastecimientoService);

  private readonly snackBar =
    inject(MatSnackBar);

  productoSeleccionado:
    Producto | null = null;

  guardando = false;

  mostrarNuevoCodigo = false;

  cambiarPrecio = false;

  mensajeBusqueda = '';

  readonly busquedaControl =
    this.fb.nonNullable.control('');

  readonly formulario =
    this.fb.nonNullable.group({

      cantidad: [
        1,
        [
          Validators.required,
          Validators.min(1),
          Validators.pattern(/^\d+$/)
        ]
      ],

      costo_unitario: [
        0,
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ],

      fecha_caducidad: [
        ''
      ],

      codigo_barra: [
        '',
        [
          Validators.maxLength(50)
        ]
      ],

      precio_venta: [
        0,
        [
          Validators.required,
          Validators.min(0.01)
        ]
      ]

    });

  readonly fechaHoy =
    this.obtenerFechaHoy();

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['productoInicial']
    ) {

      if (
        this.productoInicial
      ) {

        this.aplicarProducto(
          this.productoInicial
        );

      } else {

        this.limpiarSeleccion();

      }

    }

  }

  get resultadosBusqueda():
    Producto[] {

    const textoOriginal =
      this.busquedaControl
        .value
        .trim();

    const termino =
      this.normalizarTexto(
        textoOriginal
      );

    if (
      termino.length < 2
    ) {

      return [];

    }

    const esCodigoInterno =
      termino.startsWith(
        'prod'
      );

    const esNumerico =
      /^\d+$/.test(
        textoOriginal
      );

    return this.productos
      .filter(
        producto => {

          if (
            !producto.estado
          ) {

            return false;

          }

          const nombre =
            this.normalizarTexto(
              producto
                .nombre_producto
            );

          const categoria =
            this.normalizarTexto(
              producto
                .categoria
                ?.nombre_categoria
              ?? ''
            );

          /*
           * Las búsquedas normales solo miran
           * nombre y categoría.
           *
           * Así una "r" no coincide simplemente
           * porque el código interno contiene PROD.
           */
          const coincideTexto =
            nombre.includes(
              termino
            )
            || categoria.includes(
              termino
            );

          let coincideCodigoInterno =
            false;

          if (
            esCodigoInterno
          ) {

            coincideCodigoInterno =
              this.normalizarTexto(
                producto
                  .codigo_producto
              )
                .startsWith(
                  termino
                );

          }

          let coincideCodigoBarra =
            false;

          if (
            esNumerico
          ) {

            coincideCodigoBarra =
              this
                .obtenerCodigosProducto(
                  producto
                )
                .some(
                  codigo =>
                    codigo.estado
                    && codigo
                      .codigo_barra
                      .startsWith(
                        textoOriginal
                      )
                );

          }

          return (
            coincideTexto
            || coincideCodigoInterno
            || coincideCodigoBarra
          );

        }
      )
      .slice(
        0,
        8
      );

  }

  get codigosActuales():
    CodigoBarraProducto[] {

    if (
      !this.productoSeleccionado
    ) {

      return [];

    }

    return this
      .obtenerCodigosProducto(
        this.productoSeleccionado
      )
      .filter(
        codigo =>
          codigo.estado
      );

  }

  get stockActual(): number {

    return Number(
      this.productoSeleccionado
        ?.stock_producto
      ?? 0
    );

  }

  get costoActual(): number {

    return Number(
      this.productoSeleccionado
        ?.costo_producto
      ?? 0
    );

  }

  get precioActual(): number {

    return Number(
      this.productoSeleccionado
        ?.precio_producto
      ?? 0
    );

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

  get costoNuevo(): number {

    return Number(
      this.formulario
        .controls
        .costo_unitario
        .value
      ?? 0
    );

  }

  get stockResultante(): number {

    return (
      this.stockActual
      + this.cantidadIngresada
    );

  }

  get costoTotalIngreso(): number {

    return this.redondear(
      this.cantidadIngresada
      * this.costoNuevo
    );

  }

  get margenActual():
    number | null {

    const precio =
      this.precioActual;

    const costo =
      this.costoActual;

    if (
      precio <= 0
    ) {

      return null;

    }

    return this.redondear(
      (
        (
          precio
          - costo
        )
        / precio
      )
      * 100
    );

  }

  get precioSugerido():
    number | null {

    const margen =
      this.margenActual;

    const costo =
      this.costoNuevo;

    if (
      margen === null
      || margen <= 0
      || margen >= 100
      || costo <= 0
    ) {

      return null;

    }

    const margenDecimal =
      margen / 100;

    const divisor =
      1 - margenDecimal;

    if (
      divisor <= 0
    ) {

      return null;

    }

    return this.redondear(
      costo / divisor
    );

  }

  get precioFinal(): number {

    if (
      !this.cambiarPrecio
    ) {

      return this.precioActual;

    }

    return Number(
      this.formulario
        .controls
        .precio_venta
        .value
      ?? 0
    );

  }

  get formularioValido():
    boolean {

    return (
      this.formulario.valid
      && this.productoSeleccionado
        !== null
      && !this.guardando
    );

  }

  seleccionarConEnter(
    event: Event
  ): void {

    event.preventDefault();

    const textoOriginal =
      this.busquedaControl
        .value
        .trim();

    if (
      textoOriginal.length === 0
    ) {

      return;

    }

    const termino =
      this.normalizarTexto(
        textoOriginal
      );

    /*
     * Primero buscamos coincidencia exacta.
     */
    const coincidenciaExacta =
      this.productos.find(
        producto => {

          if (
            !producto.estado
          ) {

            return false;

          }

          const codigoInterno =
            this.normalizarTexto(
              producto
                .codigo_producto
            );

          const nombre =
            this.normalizarTexto(
              producto
                .nombre_producto
            );

          const coincideCodigoBarra =
            this
              .obtenerCodigosProducto(
                producto
              )
              .some(
                codigo =>
                  codigo.estado
                  && codigo
                    .codigo_barra
                    === textoOriginal
              );

          return (
            codigoInterno === termino
            || nombre === termino
            || coincideCodigoBarra
          );

        }
      );

    if (
      coincidenciaExacta
    ) {

      this.aplicarProducto(
        coincidenciaExacta
      );

      return;

    }

    /*
     * Si solo existe un resultado visible,
     * Enter también puede seleccionarlo.
     */
    if (
      this.resultadosBusqueda
        .length === 1
    ) {

      this.aplicarProducto(
        this.resultadosBusqueda[
          0
        ]
      );

      return;

    }

    if (
      this.resultadosBusqueda
        .length === 0
    ) {

      this.mensajeBusqueda =
        'No encontramos un producto con esa búsqueda.';

      return;

    }

    this.mensajeBusqueda =
      'Hay varias coincidencias. Selecciona el producto correcto de la lista.';

  }

  buscarProducto(): void {

    this.mensajeBusqueda = '';

  }

  seleccionarProducto(
    producto: Producto
  ): void {

    this.aplicarProducto(
      producto
    );

  }

  volverABusqueda(): void {

    if (
      this.guardando
    ) {

      return;

    }

    this.limpiarSeleccion();

  }

  solicitarCrearProducto(): void {

    if (
      this.guardando
    ) {

      return;

    }

    this.crearProducto.emit();

  }

  alternarNuevoCodigo(): void {

    this.mostrarNuevoCodigo =
      !this.mostrarNuevoCodigo;

    if (
      !this.mostrarNuevoCodigo
    ) {

      this.formulario
        .controls
        .codigo_barra
        .setValue('');

    }

  }

  mantenerPrecioActual(): void {

    this.cambiarPrecio =
      false;

    this.formulario
      .controls
      .precio_venta
      .setValue(
        this.precioActual
      );

  }

  cambiarPrecioVenta(): void {

    this.cambiarPrecio =
      true;

    this.formulario
      .controls
      .precio_venta
      .setValue(
        this.precioSugerido
        ?? this.precioActual
      );

  }

  usarPrecioSugerido(): void {

    if (
      this.precioSugerido
        === null
    ) {

      return;

    }

    this.cambiarPrecio =
      true;

    this.formulario
      .controls
      .precio_venta
      .setValue(
        this.precioSugerido
      );

  }

  guardar(): void {

    if (
      this.guardando
    ) {

      return;

    }

    if (
      !this.productoSeleccionado
      || !this.productoSeleccionado
        .id_producto
    ) {

      this.mostrarMensaje(
        'Primero selecciona el producto que deseas abastecer.'
      );

      return;

    }

    if (
      this.formulario.invalid
    ) {

      this.formulario
        .markAllAsTouched();

      this.mostrarMensaje(
        'Revisa los datos del abastecimiento.'
      );

      return;

    }

    const valores =
      this.formulario
        .getRawValue();

    const fecha =
      valores
        .fecha_caducidad
        .trim();

    const nuevoCodigo =
      valores
        .codigo_barra
        .trim();

    const datos:
      RegistrarAbastecimientoRequest = {

      id_producto:
        this.productoSeleccionado
          .id_producto,

      cantidad:
        Number(
          valores.cantidad
        ),

      costo_unitario:
        Number(
          valores.costo_unitario
        ),

      fecha_caducidad:
        fecha !== ''
          ? fecha
          : null,

      codigo_barra:
        (
          this.mostrarNuevoCodigo
          && nuevoCodigo !== ''
        )
          ? nuevoCodigo
          : null,

      precio_venta:
        this.cambiarPrecio
          ? Number(
              valores
                .precio_venta
            )
          : null

    };

    this.guardando =
      true;

    this.abastecimientoService
      .registrar(
        datos
      )
      .pipe(
        finalize(
          () => {

            this.guardando =
              false;

          }
        )
      )
      .subscribe({

        next: response => {

          this.mostrarMensaje(
            response.mensaje
            ?? 'Abastecimiento registrado correctamente.'
          );

          this
            .abastecimientoRegistrado
            .emit(
              response
                .data
                .producto
            );

        },

        error: error => {

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo registrar el abastecimiento.'
            )
          );

        }

      });

  }

  cerrarComponente(): void {

    if (
      this.guardando
    ) {

      return;

    }

    this.cerrar.emit();

  }

  formatearPrecio(
    valor:
      number | null
  ): string {

    if (
      valor === null
    ) {

      return '—';

    }

    return new Intl.NumberFormat(
      'es-PE',
      {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 2
      }
    ).format(
      Number(valor)
    );

  }

  formatearPorcentaje(
    valor:
      number | null
  ): string {

    if (
      valor === null
    ) {

      return '—';

    }

    return `${valor.toFixed(2)} %`;

  }

  private aplicarProducto(
    producto: Producto
  ): void {

    if (
      !producto.estado
    ) {

      this.mostrarMensaje(
        'El producto está inactivo. Actívalo antes de abastecerlo.'
      );

      return;

    }

    this.productoSeleccionado =
      producto;

    this.busquedaControl
      .setValue('');

    this.mensajeBusqueda = '';

    this.mostrarNuevoCodigo =
      false;

    this.cambiarPrecio =
      false;

    this.formulario.reset({

      cantidad:
        1,

      costo_unitario:
        Number(
          producto
            .costo_producto
          ?? 0
        ),

      fecha_caducidad:
        '',

      codigo_barra:
        '',

      precio_venta:
        Number(
          producto
            .precio_producto
          ?? 0
        )

    });

    this.formulario
      .markAsPristine();

    this.formulario
      .markAsUntouched();

  }

  private limpiarSeleccion():
    void {

    this.productoSeleccionado =
      null;

    this.busquedaControl
      .setValue('');

    this.mensajeBusqueda = '';

    this.mostrarNuevoCodigo =
      false;

    this.cambiarPrecio =
      false;

  }

  private obtenerCodigosProducto(
    producto: Producto
  ): CodigoBarraProducto[] {

    return (
      producto.codigos_barra
      ?? producto.codigosBarra
      ?? []
    );

  }

  private normalizarTexto(
    valor: string
  ): string {

    return valor
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      );

  }

  private redondear(
    valor: number
  ): number {

    return Math.round(
      (
        valor
        + Number.EPSILON
      )
      * 100
    ) / 100;

  }

  private obtenerFechaHoy():
    string {

    const fecha =
      new Date();

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth()
        + 1
      )
        .padStart(
          2,
          '0'
        );

    const dia =
      String(
        fecha.getDate()
      )
        .padStart(
          2,
          '0'
        );

    return (
      `${anio}-${mes}-${dia}`
    );

  }

  private obtenerMensajeError(
    error: any,
    mensajeDefecto: string
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
        Array.isArray(
          primerError
        )
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
      ?? mensajeDefecto
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