import {
  ChangeDetectorRef,
  Component,
  OnInit,
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
  finalize
} from 'rxjs';

import {
  Categoria,
  CategoriaPayload
} from '../../../inventario/interfaces/categoria.interface';

import {
  CategoriaService
} from '../../../inventario/services/categoria';

type FiltroEstado =
  | 'todos'
  | 'activas'
  | 'inactivas';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss'
})
export class CategoriasComponent
implements OnInit {

  private readonly fb =
    inject(FormBuilder);

  private readonly categoriaService =
    inject(CategoriaService);

  private readonly snackBar =
    inject(MatSnackBar);

  private readonly cdr =
    inject(ChangeDetectorRef);

  categorias: Categoria[] = [];

  textoBusqueda = '';

  filtroEstado:
    FiltroEstado = 'todos';

  cargando = false;

  errorCarga = false;

  guardando = false;

  cambiandoEstadoId:
    number | null = null;

  eliminandoId:
    number | null = null;

  formularioAbierto = false;

  categoriaEditando:
    Categoria | null = null;

  categoriaAEliminar:
    Categoria | null = null;

  readonly categoriaForm =
    this.fb.nonNullable.group({

      nombre_categoria: [
        '',
        [
          Validators.required,
          Validators.maxLength(100)
        ]
      ],

      descripcion_categoria: [
        '',
        [
          Validators.maxLength(255)
        ]
      ],

      estado: [
        true,
        [
          Validators.required
        ]
      ]

    });

  ngOnInit(): void {

    this.obtenerCategorias();

  }

  get categoriasFiltradas():
    Categoria[] {

    const texto =
      this.normalizarTexto(
        this.textoBusqueda
      );

    return this.categorias.filter(
      categoria => {

        const coincideTexto =
          texto.length === 0
          || this.normalizarTexto(
            categoria.nombre_categoria
          ).includes(texto)
          || this.normalizarTexto(
            categoria.descripcion_categoria
              ?? ''
          ).includes(texto);

        const coincideEstado =
          this.filtroEstado === 'todos'
          || (
            this.filtroEstado === 'activas'
            && categoria.estado
          )
          || (
            this.filtroEstado === 'inactivas'
            && !categoria.estado
          );

        return (
          coincideTexto
          && coincideEstado
        );

      }
    );

  }

  get totalCategorias(): number {

    return this.categorias.length;

  }

  get totalActivas(): number {

    return this.categorias.filter(
      categoria => categoria.estado
    ).length;

  }

  get totalInactivas(): number {

    return this.categorias.filter(
      categoria => !categoria.estado
    ).length;

  }

  get totalProductosAsociados():
    number {

    return this.categorias.reduce(
      (
        total,
        categoria
      ) =>
        total
        + Number(
          categoria.productos_count
          ?? 0
        ),
      0
    );

  }

  obtenerCategorias(): void {

    if (this.cargando) {

      return;

    }

    this.cargando = true;

    this.errorCarga = false;

    this.categoriaService
      .listar()
      .pipe(
        finalize(() => {

          this.cargando = false;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: response => {

          this.categorias =
            response.data ?? [];

          this.errorCarga = false;

        },

        error: error => {

          console.error(
            'Error al obtener categorias:',
            error
          );

          this.categorias = [];

          this.errorCarga = true;

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudieron cargar las categorias.'
            )
          );

        }

      });

  }

  actualizarBusqueda(
    evento: Event
  ): void {

    const input =
      evento.target as
        HTMLInputElement;

    this.textoBusqueda =
      input.value;

  }

  actualizarFiltro(
    evento: Event
  ): void {

    const select =
      evento.target as
        HTMLSelectElement;

    this.filtroEstado =
      select.value as
        FiltroEstado;

  }

  limpiarFiltros(): void {

    this.textoBusqueda = '';

    this.filtroEstado =
      'todos';

  }

  abrirNuevaCategoria(): void {

    this.categoriaEditando =
      null;

    this.categoriaForm.reset({
      nombre_categoria: '',
      descripcion_categoria: '',
      estado: true
    });

    this.formularioAbierto =
      true;

  }

  abrirEditarCategoria(
    categoria: Categoria
  ): void {

    this.categoriaEditando =
      categoria;

    this.categoriaForm.reset({
      nombre_categoria:
        categoria.nombre_categoria,
      descripcion_categoria:
        categoria.descripcion_categoria
        ?? '',
      estado:
        categoria.estado
    });

    this.formularioAbierto =
      true;

  }

  cerrarFormulario(
    forzar = false
  ): void {

    if (
      this.guardando
      && !forzar
    ) {

      return;

    }

    this.formularioAbierto =
      false;

    this.categoriaEditando =
      null;

    this.categoriaForm.reset({
      nombre_categoria: '',
      descripcion_categoria: '',
      estado: true
    });

  }

  guardarCategoria(): void {

    if (
      this.categoriaForm.invalid
      || this.guardando
    ) {

      this.categoriaForm
        .markAllAsTouched();

      return;

    }

    const valores =
      this.categoriaForm
        .getRawValue();

    const datos:
      CategoriaPayload = {

        nombre_categoria:
          valores.nombre_categoria
            .trim(),

        descripcion_categoria:
          valores.descripcion_categoria
            .trim()
          || null,

        estado:
          valores.estado

      };

    this.guardando = true;

    const solicitud =
      this.categoriaEditando
      ? this.categoriaService
          .actualizar(
            this.categoriaEditando
              .id_categoria,
            datos
          )
      : this.categoriaService
          .crear(datos);

    solicitud
      .pipe(
        finalize(() => {

          this.guardando = false;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: response => {

          this.cerrarFormulario(true);

          this.mostrarMensaje(
            response.mensaje
          );

          this.obtenerCategorias();

        },

        error: error => {

          console.error(
            'Error al guardar categoria:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo guardar la categoria.'
            )
          );

        }

      });

  }

  cambiarEstado(
    categoria: Categoria
  ): void {

    if (
      this.cambiandoEstadoId
        !== null
    ) {

      return;

    }

    this.cambiandoEstadoId =
      categoria.id_categoria;

    const datos:
      CategoriaPayload = {

        nombre_categoria:
          categoria.nombre_categoria,

        descripcion_categoria:
          categoria.descripcion_categoria,

        estado:
          !categoria.estado

      };

    this.categoriaService
      .actualizar(
        categoria.id_categoria,
        datos
      )
      .pipe(
        finalize(() => {

          this.cambiandoEstadoId =
            null;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: response => {

          this.reemplazarCategoria(
            response.data
          );

          this.mostrarMensaje(
            response.data.estado
            ? 'Categoria activada correctamente.'
            : 'Categoria desactivada correctamente.'
          );

        },

        error: error => {

          console.error(
            'Error al cambiar estado:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado de la categoria.'
            )
          );

        }

      });

  }

  solicitarEliminar(
    categoria: Categoria
  ): void {

    const cantidadProductos =
      Number(
        categoria.productos_count
        ?? 0
      );

    if (
      cantidadProductos > 0
    ) {

      this.mostrarMensaje(
        'No se puede eliminar porque tiene '
        + cantidadProductos
        + ' producto(s) asociado(s).'
      );

      return;

    }

    this.categoriaAEliminar =
      categoria;

  }

  cancelarEliminacion(): void {

    if (
      this.eliminandoId
        !== null
    ) {

      return;

    }

    this.categoriaAEliminar =
      null;

  }

  confirmarEliminacion(): void {

    const categoria =
      this.categoriaAEliminar;

    if (
      !categoria
      || this.eliminandoId
        !== null
    ) {

      return;

    }

    this.eliminandoId =
      categoria.id_categoria;

    this.categoriaService
      .eliminar(
        categoria.id_categoria
      )
      .pipe(
        finalize(() => {

          this.eliminandoId =
            null;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: response => {

          this.categorias =
            this.categorias.filter(
              item =>
                item.id_categoria
                !== categoria
                  .id_categoria
            );

          this.categoriaAEliminar =
            null;

          this.mostrarMensaje(
            response.mensaje
          );

        },

        error: error => {

          console.error(
            'Error al eliminar categoria:',
            error
          );

          this.categoriaAEliminar =
            null;

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo eliminar la categoria.'
            )
          );

          this.obtenerCategorias();

        }

      });

  }

  obtenerTextoProductos(
    categoria: Categoria
  ): string {

    const cantidad =
      Number(
        categoria.productos_count
        ?? 0
      );

    if (cantidad === 1) {

      return '1 producto';

    }

    return `${cantidad} productos`;

  }

  formatearFecha(
    fecha: string
  ): string {

    if (!fecha) {

      return 'Sin fecha';

    }

    const valor =
      new Date(fecha);

    if (
      Number.isNaN(
        valor.getTime()
      )
    ) {

      return 'Sin fecha';

    }

    return new Intl.DateTimeFormat(
      'es-PE',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone:
          'America/Lima'
      }
    )
      .format(valor)
      .replace(/\./g, '');

  }

  private reemplazarCategoria(
    categoriaActualizada:
      Categoria
  ): void {

    this.categorias =
      this.categorias.map(
        categoria =>
          categoria.id_categoria
            === categoriaActualizada
              .id_categoria
          ? categoriaActualizada
          : categoria
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

}
