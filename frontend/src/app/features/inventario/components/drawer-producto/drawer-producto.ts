import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormArray,
  FormBuilder,
  FormControl,
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
  MatSelectModule
} from '@angular/material/select';

import {
  MatSlideToggleModule
} from '@angular/material/slide-toggle';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  finalize
} from 'rxjs';

import {
  Producto
} from '../../interfaces/producto.interface';

import {
  Categoria
} from '../../interfaces/categoria.interface';

import {
  ActualizarProductoRequest,
  CrearProductoRequest,
  ProductoService
} from '../../services/producto';

interface UltimoProductoFormulario {
  nombre_producto: string;
  descripcion_producto: string | null;
  id_categoria: number;
  precio_producto: number;
  stock_minimo_producto: number;
  estado: boolean;
}

interface BorradorProductoFormulario {
  nombre_producto: string;
  descripcion_producto: string;
  id_categoria: number | null;
  precio_producto: number;
  stock_minimo_producto: number;
  estado: boolean;
  codigos_barra: string[];

  ingresar_mercaderia: boolean;
  cantidad_inicial: number;
  costo_inicial: number;
  fecha_caducidad_inicial: string;
}

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
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './drawer-producto.html',
  styleUrl: './drawer-producto.scss'
})
export class DrawerProductoComponent
implements OnInit, OnChanges {

  private static readonly CLAVE_ULTIMO_PRODUCTO =
    'pequelandia_ultimo_producto';

  private static readonly CLAVE_BORRADOR_PRODUCTO =
    'pequelandia_borrador_producto';

  @Input()
  categorias: Categoria[] = [];

  @Input()
  productoEditar:
    Producto | null = null;

  @Output()
  cerrar =
    new EventEmitter<void>();

  @Output()
  guardado =
    new EventEmitter<void>();

  private readonly fb =
    inject(FormBuilder);

  private readonly productoService =
    inject(ProductoService);

  private readonly snackBar =
    inject(MatSnackBar);

  private readonly destroyRef =
    inject(DestroyRef);

  guardando = false;

  repitiendoUltimo = false;

  ultimoProductoRegistrado:
    UltimoProductoFormulario | null =
      null;

  readonly fechaHoy =
    this.obtenerFechaHoy();

  readonly formulario =
    this.fb.group({

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
        null as number | null,
        Validators.required
      ],

      precio_producto: [
        0,
        [
          Validators.required,
          Validators.min(0.01)
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

      estado: [
        true,
        Validators.required
      ],

      codigos_barra:
        this.fb.array<
          FormControl<string>
        >([]),

      ingresar_mercaderia: [
        false
      ],

      cantidad_inicial: [
        1,
        [
          Validators.min(1),
          Validators.pattern(/^\d+$/)
        ]
      ],

      costo_inicial: [
        0,
        [
          Validators.min(0.01)
        ]
      ],

      fecha_caducidad_inicial: [
        ''
      ]

    });

  get esEdicion(): boolean {

    return Boolean(
      this.productoEditar
        ?.id_producto
    );

  }

  get ingresarMercaderia():
    boolean {

    return Boolean(
      this.formulario
        .controls
        .ingresar_mercaderia
        .value
    );

  }

  get codigosBarra():
    FormArray<FormControl<string>> {

    return this.formulario
      .controls
      .codigos_barra;

  }

  get costoTotalInicial():
    number {

    const cantidad =
      Number(
        this.formulario
          .controls
          .cantidad_inicial
          .value
        ?? 0
      );

    const costo =
      Number(
        this.formulario
          .controls
          .costo_inicial
          .value
        ?? 0
      );

    return this.redondear(
      cantidad * costo
    );

  }

  get margenInicial():
    number | null {

    const precio =
      Number(
        this.formulario
          .controls
          .precio_producto
          .value
        ?? 0
      );

    const costo =
      Number(
        this.formulario
          .controls
          .costo_inicial
          .value
        ?? 0
      );

    if (
      precio <= 0
      || costo <= 0
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

  get puedeAgregarCodigo():
    boolean {

    return (
      this.codigosBarra.length < 10
      && !this.guardando
    );

  }

  get puedeRepetirUltimo():
    boolean {

    return (
      !this.esEdicion
      && !this.guardando
      && this.ultimoProductoRegistrado
        !== null
    );

  }

  ngOnInit(): void {

    this.cargarUltimoProductoGuardado();

    if (
      !this.esEdicion
    ) {

      this.restaurarBorradorProducto();

    }

    if (
      this.codigosBarra.length === 0
    ) {

      this.agregarCodigoBarra();

    }

    this.formulario
      .valueChanges
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(
        () => {

          if (
            !this.esEdicion
            && !this.guardando
          ) {

            this.guardarBorradorProducto();

          }

        }
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

    if (
      this.guardando
    ) {

      return;

    }

    this.cerrar.emit();

  }

  cancelarFormulario(): void {

    if (
      this.guardando
    ) {

      return;

    }

    if (
      !this.esEdicion
    ) {

      this.eliminarBorradorProducto();

    }

    this.cerrar.emit();

  }

  agregarCodigoBarra(
    valor = ''
  ): void {

    if (
      this.codigosBarra.length >= 10
    ) {

      return;

    }

    this.codigosBarra.push(
      this.fb.nonNullable.control(
        valor,
        [
          Validators.maxLength(50)
        ]
      )
    );

  }

  quitarCodigoBarra(
    indice: number
  ): void {

    if (
      this.codigosBarra.length === 1
    ) {

      this.codigosBarra
        .at(0)
        .setValue('');

      return;

    }

    this.codigosBarra
      .removeAt(
        indice
      );

  }

  generarCodigoBarra(
    indice: number
  ): void {

    const aleatorio =
      Math.floor(
        Math.random()
        * 1_000_000_000
      )
        .toString()
        .padStart(
          9,
          '0'
        );

    const base =
      `290${aleatorio}`;

    const digito =
      this.calcularDigitoControlEan13(
        base
      );

    this.codigosBarra
      .at(indice)
      .setValue(
        `${base}${digito}`
      );

  }

  repetirUltimoProducto(): void {

    if (
      !this.puedeRepetirUltimo
      || !this.ultimoProductoRegistrado
    ) {

      return;

    }

    const producto =
      this.ultimoProductoRegistrado;

    this.repitiendoUltimo =
      true;

    this.formulario.patchValue({

      nombre_producto:
        producto.nombre_producto,

      descripcion_producto:
        producto.descripcion_producto
        ?? '',

      id_categoria:
        producto.id_categoria,

      precio_producto:
        producto.precio_producto,

      stock_minimo_producto:
        producto
          .stock_minimo_producto,

      estado:
        producto.estado,

      ingresar_mercaderia:
        false,

      cantidad_inicial:
        1,

      costo_inicial:
        0,

      fecha_caducidad_inicial:
        ''

    });

    this.reemplazarCodigos(
      []
    );

    setTimeout(
      () => {

        this.repitiendoUltimo =
          false;

      },
      450
    );

  }

  guardar(): void {

    if (
      this.guardando
    ) {

      return;

    }

    if (
      this.formulario.invalid
    ) {

      this.formulario
        .markAllAsTouched();

      this.mostrarMensaje(
        'Completa correctamente los campos obligatorios.'
      );

      return;

    }

    if (
      this.tieneCodigosRepetidos()
    ) {

      this.mostrarMensaje(
        'No puedes registrar el mismo código de barras más de una vez.'
      );

      return;

    }

    if (
      !this.esEdicion
      && this.ingresarMercaderia
    ) {

      const cantidad =
        Number(
          this.formulario
            .controls
            .cantidad_inicial
            .value
        );

      const costo =
        Number(
          this.formulario
            .controls
            .costo_inicial
            .value
        );

      if (
        cantidad < 1
        || !Number.isInteger(
          cantidad
        )
      ) {

        this.mostrarMensaje(
          'Ingresa una cantidad inicial válida.'
        );

        return;

      }

      if (
        costo <= 0
      ) {

        this.mostrarMensaje(
          'Ingresa el costo de compra de la mercadería.'
        );

        return;

      }

    }

    const valores =
      this.formulario
        .getRawValue();

    const datosBase = {

      nombre_producto:
        String(
          valores.nombre_producto
          ?? ''
        ).trim(),

      descripcion_producto:
        String(
          valores.descripcion_producto
          ?? ''
        ).trim()
        || null,

      id_categoria:
        Number(
          valores.id_categoria
        ),

      precio_producto:
        Number(
          valores.precio_producto
        ),

      stock_minimo_producto:
        Number(
          valores
            .stock_minimo_producto
        ),

      estado:
        Boolean(
          valores.estado
        ),

      codigos_barra:
        this.obtenerCodigosNormalizados()

    };

    this.guardando =
      true;

    if (
      this.esEdicion
      && this.productoEditar
        ?.id_producto
    ) {

      this.actualizarProducto(
        this.productoEditar
          .id_producto,
        datosBase
      );

      return;

    }

    const productoNuevo:
      CrearProductoRequest = {
      ...datosBase
    };

    if (
      this.ingresarMercaderia
    ) {

      productoNuevo.stock_producto =
        Number(
          valores.cantidad_inicial
        );

      productoNuevo.costo_producto =
        Number(
          valores.costo_inicial
        );

      productoNuevo.fecha_caducidad =
        String(
          valores.fecha_caducidad_inicial
          ?? ''
        ).trim()
        || null;

    }

    this.registrarProducto(
      productoNuevo
    );

  }

  private registrarProducto(
    producto:
      CrearProductoRequest
  ): void {

    this.productoService
      .registrar(
        producto
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

          this.eliminarBorradorProducto();

          this.guardarUltimoProducto(
            response.data
          );

          this.mostrarMensaje(
            response.mensaje
            ?? 'Producto registrado correctamente.'
          );

          this.guardado.emit();

        },

        error: error => {

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
    producto:
      ActualizarProductoRequest
  ): void {

    this.productoService
      .actualizar(
        idProducto,
        producto
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
            ?? 'Producto actualizado correctamente.'
          );

          this.guardado.emit();

        },

        error: error => {

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

    if (
      !this.productoEditar
    ) {

      return;

    }

    this.formulario.patchValue({

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

      precio_producto:
        Number(
          this.productoEditar
            .precio_producto
        ),

      stock_minimo_producto:
        Number(
          this.productoEditar
            .stock_minimo_producto
        ),

      estado:
        Boolean(
          this.productoEditar
            .estado
        ),

      ingresar_mercaderia:
        false

    });

    const codigos =
      (
        this.productoEditar
          .codigos_barra
        ?? this.productoEditar
          .codigosBarra
        ?? []
      )
        .filter(
          codigo =>
            codigo.estado
        )
        .map(
          codigo =>
            codigo.codigo_barra
        );

    this.reemplazarCodigos(
      codigos
    );

  }

  private reemplazarCodigos(
    codigos: string[]
  ): void {

    this.codigosBarra.clear();

    const validos =
      codigos
        .map(
          codigo =>
            codigo.trim()
        )
        .filter(
          codigo =>
            codigo !== ''
        );

    if (
      validos.length === 0
    ) {

      this.agregarCodigoBarra();

      return;

    }

    validos
      .slice(
        0,
        10
      )
      .forEach(
        codigo =>
          this.agregarCodigoBarra(
            codigo
          )
      );

  }

  private obtenerCodigosNormalizados():
    string[] {

    return this.codigosBarra
      .controls
      .map(
        control =>
          control.value.trim()
      )
      .filter(
        codigo =>
          codigo !== ''
      );

  }

  private tieneCodigosRepetidos():
    boolean {

    const codigos =
      this.obtenerCodigosNormalizados();

    return (
      new Set(
        codigos
      ).size
      !== codigos.length
    );

  }

  private calcularDigitoControlEan13(
    base12: string
  ): number {

    let suma = 0;

    for (
      let indice = 0;
      indice < 12;
      indice++
    ) {

      const digito =
        Number(
          base12[indice]
        );

      suma +=
        indice % 2 === 0
          ? digito
          : digito * 3;

    }

    return (
      10
      - (
        suma % 10
      )
    ) % 10;

  }

  private guardarBorradorProducto():
    void {

    const valores =
      this.formulario
        .getRawValue();

    const borrador:
      BorradorProductoFormulario = {

      nombre_producto:
        String(
          valores.nombre_producto
          ?? ''
        ),

      descripcion_producto:
        String(
          valores.descripcion_producto
          ?? ''
        ),

      id_categoria:
        valores.id_categoria,

      precio_producto:
        Number(
          valores.precio_producto
          ?? 0
        ),

      stock_minimo_producto:
        Number(
          valores.stock_minimo_producto
          ?? 0
        ),

      estado:
        Boolean(
          valores.estado
        ),

      codigos_barra:
        this.obtenerCodigosNormalizados(),

      ingresar_mercaderia:
        Boolean(
          valores.ingresar_mercaderia
        ),

      cantidad_inicial:
        Number(
          valores.cantidad_inicial
          ?? 1
        ),

      costo_inicial:
        Number(
          valores.costo_inicial
          ?? 0
        ),

      fecha_caducidad_inicial:
        String(
          valores.fecha_caducidad_inicial
          ?? ''
        )

    };

    sessionStorage.setItem(
      DrawerProductoComponent
        .CLAVE_BORRADOR_PRODUCTO,
      JSON.stringify(
        borrador
      )
    );

  }

  private restaurarBorradorProducto():
    void {

    try {

      const contenido =
        sessionStorage.getItem(
          DrawerProductoComponent
            .CLAVE_BORRADOR_PRODUCTO
        );

      if (
        !contenido
      ) {

        return;

      }

      const borrador =
        JSON.parse(
          contenido
        ) as BorradorProductoFormulario;

      this.formulario.patchValue(
        borrador
      );

      this.reemplazarCodigos(
        borrador.codigos_barra
        ?? []
      );

    } catch {
      this.eliminarBorradorProducto();
    }

  }

  private eliminarBorradorProducto():
    void {

    sessionStorage.removeItem(
      DrawerProductoComponent
        .CLAVE_BORRADOR_PRODUCTO
    );

  }

  private guardarUltimoProducto(
    producto: Producto
  ): void {

    const temporal:
      UltimoProductoFormulario = {

      nombre_producto:
        producto.nombre_producto,

      descripcion_producto:
        producto.descripcion_producto,

      id_categoria:
        producto.id_categoria,

      precio_producto:
        Number(
          producto.precio_producto
        ),

      stock_minimo_producto:
        Number(
          producto.stock_minimo_producto
        ),

      estado:
        producto.estado

    };

    this.ultimoProductoRegistrado =
      temporal;

    sessionStorage.setItem(
      DrawerProductoComponent
        .CLAVE_ULTIMO_PRODUCTO,
      JSON.stringify(
        temporal
      )
    );

  }

  private cargarUltimoProductoGuardado():
    void {

    try {

      const contenido =
        sessionStorage.getItem(
          DrawerProductoComponent
            .CLAVE_ULTIMO_PRODUCTO
        );

      if (
        contenido
      ) {

        this.ultimoProductoRegistrado =
          JSON.parse(
            contenido
          );

      }

    } catch {
      this.ultimoProductoRegistrado =
        null;
    }

  }

  private obtenerFechaHoy():
    string {

    const fecha =
      new Date();

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

  private obtenerMensajeError(
    error: any,
    defecto: string
  ): string {

    const errores =
      error?.error?.errors;

    if (
      errores
      && typeof errores
        === 'object'
    ) {

      const primero =
        Object.values(
          errores
        )[0];

      if (
        Array.isArray(
          primero
        )
      ) {

        return String(
          primero[0]
        );

      }

    }

    return (
      error?.error?.mensaje
      ?? error?.error?.message
      ?? defecto
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