import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import { finalize } from 'rxjs';

import {
  Producto
} from '../../interfaces/producto.interface';

import {
  Categoria
} from '../../interfaces/categoria.interface';

import {
  ProductoService
} from '../../services/producto';

@Component({
  selector: 'app-drawer-producto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './drawer-producto.html',
  styleUrl: './drawer-producto.scss'
})
export class DrawerProductoComponent
implements OnChanges {

  @Input()
  categorias: Categoria[] = [];

  @Input()
  productoEditar: Producto | null = null;

  @Output()
  cerrar = new EventEmitter<void>();

  @Output()
  guardado = new EventEmitter<void>();

  private fb =
    inject(FormBuilder);

  private productoService =
    inject(ProductoService);

  private snackBar =
    inject(MatSnackBar);

  guardando = false;

  formulario: FormGroup =
    this.fb.group({

      codigo_producto: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],

      nombre_producto: [
        '',
        [
          Validators.required,
          Validators.maxLength(150)
        ]
      ],

      descripcion_producto: [
        ''
      ],

      id_categoria: [
        null,
        Validators.required
      ],

      costo_producto: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      precio_producto: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],

      stock_producto: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^\d+$/)
        ]
      ],

      stock_minimo_producto: [
        0,
        [
          Validators.required,
          Validators.min(0),
          Validators.pattern(/^\d+$/)
        ]
      ],

      fecha_caducidad_producto: [
        null
      ],

      estado: [
        true,
        Validators.required
      ]

    });

  get esEdicion(): boolean {

    return Boolean(
      this.productoEditar?.id_producto
    );

  }

  ngOnChanges(
    changes: SimpleChanges
  ): void {

    if (
      changes['productoEditar']
    ) {

      this.cargarFormulario();

    }

  }

  cerrarDrawer(): void {

    if (this.guardando) {

      return;

    }

    this.cerrar.emit();

  }

  generarCodigo(): void {

    if (this.guardando) {

      return;

    }

    const codigo =
      Math.floor(
        100000000000
        + Math.random()
        * 900000000000
      ).toString();

    this.formulario.patchValue({

      codigo_producto: codigo

    });

  }

  guardar(): void {

    if (this.guardando) {

      return;

    }

    if (this.formulario.invalid) {

      this.formulario
        .markAllAsTouched();

      this.mostrarMensaje(
        'Complete correctamente los campos obligatorios.'
      );

      return;

    }

    const valores =
      this.formulario.getRawValue();

    const fechaCaducidad =
      valores.fecha_caducidad_producto;

    const producto: Producto = {

      codigo_producto:
        String(
          valores.codigo_producto
        ).trim(),

      nombre_producto:
        String(
          valores.nombre_producto
        ).trim(),

      descripcion_producto:
        valores.descripcion_producto
          ?.trim()
        || null,

      id_categoria:
        Number(
          valores.id_categoria
        ),

      costo_producto:
        Number(
          valores.costo_producto
        ),

      precio_producto:
        Number(
          valores.precio_producto
        ),

      /*
       * En edición se conserva el
       * stock actual del producto.
       * El cambio real de stock se
       * realizará desde otra opción.
       */
      stock_producto:
        this.esEdicion
          ? Number(
              this.productoEditar
                ?.stock_producto
              ?? 0
            )
          : Number(
              valores.stock_producto
            ),

      stock_minimo_producto:
        Number(
          valores.stock_minimo_producto
        ),

      fecha_caducidad:
        fechaCaducidad
          ? this.formatearFechaApi(
              fechaCaducidad
            )
          : null,

      estado:
        Boolean(
          valores.estado
        )

    };

    this.guardando = true;

    if (
      this.esEdicion
      && this.productoEditar?.id_producto
    ) {

      this.actualizarProducto(
        this.productoEditar.id_producto,
        producto
      );

      return;

    }

    this.registrarProducto(
      producto
    );

  }

  private registrarProducto(
    producto: Producto
  ): void {

    this.productoService
      .registrar(producto)
      .pipe(
        finalize(() => {

          this.guardando = false;

        })
      )
      .subscribe({

        next: (response) => {

          this.mostrarMensaje(
            response.mensaje
            ?? 'Producto registrado correctamente.'
          );

          this.guardado.emit();

        },

        error: (error) => {

          console.error(
            'Error al registrar producto:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo registrar el producto.'
            )
          );

        }

      });

  }

  private actualizarProducto(
    idProducto: number,
    producto: Producto
  ): void {

    this.productoService
      .actualizar(
        idProducto,
        producto
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
            ?? 'Producto actualizado correctamente.'
          );

          this.guardado.emit();

        },

        error: (error) => {

          console.error(
            'Error al actualizar producto:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo actualizar el producto.'
            )
          );

        }

      });

  }

  private cargarFormulario(): void {

    if (!this.productoEditar) {

      this.formulario.reset({

        codigo_producto: '',

        nombre_producto: '',

        descripcion_producto: '',

        id_categoria: null,

        costo_producto: 0,

        precio_producto: 0,

        stock_producto: 0,

        stock_minimo_producto: 0,

        fecha_caducidad_producto:
          null,

        estado: true

      });

      return;

    }

    const fechaCaducidad =
      this.productoEditar
        .fecha_caducidad
      ? this.crearFechaLocal(
          this.productoEditar
            .fecha_caducidad
        )
      : null;

    this.formulario.patchValue({

      codigo_producto:
        this.productoEditar
          .codigo_producto,

      nombre_producto:
        this.productoEditar
          .nombre_producto,

      descripcion_producto:
        this.productoEditar
          .descripcion_producto
        ?? '',

      id_categoria:
        this.productoEditar
          .id_categoria,

      costo_producto:
        Number(
          this.productoEditar
            .costo_producto
        ),

      precio_producto:
        Number(
          this.productoEditar
            .precio_producto
        ),

      stock_producto:
        Number(
          this.productoEditar
            .stock_producto
        ),

      stock_minimo_producto:
        Number(
          this.productoEditar
            .stock_minimo_producto
        ),

      fecha_caducidad_producto:
        fechaCaducidad,

      estado:
        Boolean(
          this.productoEditar
            .estado
        )

    });

  }

  private crearFechaLocal(
    fecha: string
  ): Date {

    const partes =
      fecha
        .substring(0, 10)
        .split('-');

    return new Date(
      Number(partes[0]),
      Number(partes[1]) - 1,
      Number(partes[2])
    );

  }

  private formatearFechaApi(
    fecha: Date | string
  ): string {

    if (
      typeof fecha === 'string'
    ) {

      return fecha.substring(
        0,
        10
      );

    }

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const dia =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${anio}-${mes}-${dia}`;

  }

  private obtenerMensajeError(
    error: any,
    mensajeDefecto: string
  ): string {

    const erroresValidacion =
      error?.error?.errors;

    if (
      erroresValidacion
      && typeof erroresValidacion
        === 'object'
    ) {

      const primerError =
        Object.values(
          erroresValidacion
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