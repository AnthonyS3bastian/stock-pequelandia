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
  FormsModule
} from '@angular/forms';

import {
  MatSidenavModule
} from '@angular/material/sidenav';

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
  Categoria
} from '../../interfaces/categoria.interface';

import {
  Producto
} from '../../interfaces/producto.interface';

import {
  CategoriaService
} from '../../services/categoria';

import {
  ProductoService
} from '../../services/producto';

import {
  DrawerProductoComponent
} from '../../components/drawer-producto/drawer-producto';

import {
  DetalleProductoComponent
} from '../../components/detalle-producto/detalle-producto';

import {
  ActualizarStockComponent
} from '../../components/actualizar-stock/actualizar-stock';

type VistaInventario =
  | 'productos'
  | 'alertas';

type FiltroDisponibilidad =
  | 'todos'
  | 'disponible'
  | 'stock_bajo'
  | 'agotado'
  | 'por_vencer'
  | 'vencido'
  | 'inactivo';

type ContenidoDrawer =
  | 'nuevo'
  | 'detalle'
  | 'editar'
  | 'stock';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSidenavModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DrawerProductoComponent,
    DetalleProductoComponent,
    ActualizarStockComponent
  ],
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss'
})
export class InventarioComponent
implements OnInit {

  private categoriaService =
    inject(CategoriaService);

  private productoService =
    inject(ProductoService);

  private snackBar =
    inject(MatSnackBar);

  private cdr =
    inject(ChangeDetectorRef);

  categorias: Categoria[] = [];

  productos: Producto[] = [];

  productoSeleccionado:
    Producto | null = null;

  cargando = false;

  cargandoCategorias = false;

  cargandoDetalle = false;

  cambiandoEstadoId:
    number | null = null;

  errorCarga = false;

  textoBusqueda = '';

  categoriaSeleccionada = 0;

  estadoSeleccionado = 'todos';

  vistaActual: VistaInventario =
    'productos';

  filtroDisponibilidad:
    FiltroDisponibilidad = 'todos';

  drawerAbierto = false;

  contenidoDrawer:
    ContenidoDrawer = 'nuevo';

  ngOnInit(): void {

    this.obtenerCategorias();

    this.obtenerProductos();

  }

  obtenerCategorias(): void {

    this.cargandoCategorias = true;

    this.categoriaService
      .listar()
      .subscribe({

        next: (response) => {

          this.categorias =
            response.data ?? [];

          this.cargandoCategorias =
            false;

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Error al obtener categorías:',
            error
          );

          this.categorias = [];

          this.cargandoCategorias =
            false;

          this.cdr.detectChanges();

        }

      });

  }

  obtenerProductos(): void {

    if (this.cargando) {

      return;

    }

    this.cargando = true;

    this.errorCarga = false;

    this.productoService
      .listar()
      .subscribe({

        next: (response) => {

          this.productos =
            response.data ?? [];

          this.cargando = false;

          this.errorCarga = false;

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Error al obtener productos:',
            error
          );

          this.productos = [];

          this.cargando = false;

          this.errorCarga = true;

          this.cdr.detectChanges();

        }

      });

  }

  actualizarInventario(): void {

    this.obtenerCategorias();

    this.obtenerProductos();

  }

  get productosFiltrados():
    Producto[] {

    const texto =
      this.normalizarTexto(
        this.textoBusqueda
      );

    return this.productos.filter(
      (producto) => {

        const nombreProducto =
          this.normalizarTexto(
            producto.nombre_producto
          );

        const codigoProducto =
          this.normalizarTexto(
            producto.codigo_producto
          );

        const nombreCategoria =
          this.normalizarTexto(
            producto.categoria
              ?.nombre_categoria
            ?? ''
          );

        const coincideTexto =
          texto.length === 0
          || nombreProducto
            .includes(texto)
          || codigoProducto
            .includes(texto)
          || nombreCategoria
            .includes(texto);

        const coincideCategoria =
          Number(
            this.categoriaSeleccionada
          ) === 0
          || producto.id_categoria
            === Number(
              this.categoriaSeleccionada
            );

        const coincideEstado =
          this.estadoSeleccionado
            === 'todos'
          || (
            this.estadoSeleccionado
              === 'activos'
            && producto.estado
          )
          || (
            this.estadoSeleccionado
              === 'inactivos'
            && !producto.estado
          );

        const coincideVista =
          this.vistaActual
            === 'productos'
          || this.tieneAlerta(
            producto
          );

        const coincideDisponibilidad =
          this.coincideFiltroDisponibilidad(
            producto
          );

        return (
          coincideTexto
          && coincideCategoria
          && coincideEstado
          && coincideVista
          && coincideDisponibilidad
        );

      }
    );

  }

  get totalProductos(): number {

    return this.productos.length;

  }

  get totalStockBajo(): number {

    return this.productos.filter(
      (producto) =>
        this.esStockBajo(producto)
    ).length;

  }

  get totalAgotados(): number {

    return this.productos.filter(
      (producto) =>
        this.esAgotado(producto)
    ).length;

  }

  get totalPorVencer(): number {

    return this.productos.filter(
      (producto) =>
        this.estaProximoAVencer(
          producto
        )
    ).length;

  }

  get totalVencidos(): number {

    return this.productos.filter(
      (producto) =>
        this.estaVencido(producto)
    ).length;

  }

  get totalInactivos(): number {

    return this.productos.filter(
      (producto) =>
        !producto.estado
    ).length;

  }

  get totalAlertas(): number {

    return this.productos.filter(
      (producto) =>
        this.tieneAlerta(producto)
    ).length;

  }

  buscarProducto(): void {

    if (
      this.textoBusqueda
        .trim()
        .length === 0
    ) {

      this.filtroDisponibilidad =
        'todos';

    }

  }

  limpiarBusqueda(): void {

    this.textoBusqueda = '';

  }

  cambiarVista(
    vista: VistaInventario
  ): void {

    this.vistaActual = vista;

    this.filtroDisponibilidad =
      'todos';

    this.textoBusqueda = '';

    this.categoriaSeleccionada =
      0;

    this.estadoSeleccionado =
      'todos';

  }

  filtrarPorTarjeta(
    filtro: FiltroDisponibilidad
  ): void {

    this.vistaActual =
      'productos';

    this.filtroDisponibilidad =
      filtro;

  }

  cambiarFiltroDisponibilidad(
    filtro: FiltroDisponibilidad
  ): void {

    this.filtroDisponibilidad =
      filtro;

  }

  limpiarFiltros(): void {

    this.textoBusqueda = '';

    this.categoriaSeleccionada =
      0;

    this.estadoSeleccionado =
      'todos';

    this.filtroDisponibilidad =
      'todos';

  }

  abrirDrawer(): void {

    this.productoSeleccionado =
      null;

    this.contenidoDrawer =
      'nuevo';

    this.drawerAbierto = true;

  }

  verInformacion(
    producto: Producto
  ): void {

    if (
      !producto.id_producto
      || this.cargandoDetalle
    ) {

      return;

    }

    this.cargandoDetalle = true;

    this.productoService
      .obtenerPorId(
        producto.id_producto
      )
      .subscribe({

        next: (response) => {

          this.productoSeleccionado =
            response.data;

          this.contenidoDrawer =
            'detalle';

          this.drawerAbierto = true;

          this.cargandoDetalle =
            false;

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Error al obtener producto:',
            error
          );

          this.cargandoDetalle =
            false;

          this.mostrarMensaje(
            'No se pudo obtener la información del producto.'
          );

          this.cdr.detectChanges();

        }

      });

  }

  editarProducto(
    producto: Producto
  ): void {

    this.productoSeleccionado =
      producto;

    this.contenidoDrawer =
      'editar';

    this.drawerAbierto = true;

    this.cdr.detectChanges();

  }

  actualizarStockProducto(
    producto: Producto
  ): void {

    this.productoSeleccionado =
      producto;

    this.contenidoDrawer =
      'stock';

    this.drawerAbierto = true;

    this.cdr.detectChanges();

  }

  productoGuardado(): void {

    this.drawerAbierto = false;

    this.productoSeleccionado =
      null;

    this.obtenerProductos();

  }

  stockActualizado(
    producto: Producto
  ): void {

    this.actualizarProductoEnLista(
      producto
    );

    this.drawerAbierto = false;

    this.productoSeleccionado =
      null;

    this.obtenerProductos();

  }

  cambiarEstadoProducto(
    producto: Producto
  ): void {

    const idProducto =
      producto.id_producto;

    if (
      !idProducto
      || this.cambiandoEstadoId
        !== null
    ) {

      return;

    }

    this.cambiandoEstadoId =
      idProducto;

    this.productoService
      .cambiarEstado(
        idProducto
      )
      .pipe(
        finalize(() => {

          this.cambiandoEstadoId =
            null;

          this.cdr.detectChanges();

        })
      )
      .subscribe({

        next: (response) => {

          this.actualizarProductoEnLista(
            response.data
          );

          this.productoSeleccionado =
            response.data;

          this.drawerAbierto =
            false;

          this.mostrarMensaje(
            response.mensaje
          );

          this.obtenerProductos();

        },

        error: (error) => {

          console.error(
            'Error al cambiar estado:',
            error
          );

          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              'No se pudo cambiar el estado del producto.'
            )
          );

        }

      });

  }

  cerrarDrawer(): void {

    this.drawerAbierto = false;

    this.productoSeleccionado =
      null;

  }

  tieneAlerta(
    producto: Producto
  ): boolean {

    return (
      producto.estado
      && (
        this.esStockBajo(
          producto
        )
        || this.esAgotado(
          producto
        )
        || this.estaProximoAVencer(
          producto
        )
        || this.estaVencido(
          producto
        )
      )
    );

  }

  esStockBajo(
    producto: Producto
  ): boolean {

    return (
      producto.estado
      && producto.stock_producto > 0
      && producto
        .stock_minimo_producto > 0
      && producto.stock_producto
        <= producto
          .stock_minimo_producto
    );

  }

  esAgotado(
    producto: Producto
  ): boolean {

    return (
      producto.estado
      && producto.stock_producto
        === 0
    );

  }

  estaDisponible(
    producto: Producto
  ): boolean {

    return (
      producto.estado
      && producto.stock_producto > 0
      && !this.esStockBajo(
        producto
      )
      && !this.estaVencido(
        producto
      )
      && !this.estaProximoAVencer(
        producto
      )
    );

  }

  estaProximoAVencer(
    producto: Producto
  ): boolean {

    if (
      !producto.estado
      || !producto.fecha_caducidad
    ) {

      return false;

    }

    const dias =
      this.obtenerDiasParaVencer(
        producto
      );

    return (
      dias !== null
      && dias >= 0
      && dias <= 30
    );

  }

  estaVencido(
    producto: Producto
  ): boolean {

    if (
      !producto.estado
      || !producto.fecha_caducidad
    ) {

      return false;

    }

    const dias =
      this.obtenerDiasParaVencer(
        producto
      );

    return (
      dias !== null
      && dias < 0
    );

  }

  obtenerDiasParaVencer(
    producto: Producto
  ): number | null {

    if (
      !producto.fecha_caducidad
    ) {

      return null;

    }

    const fechaActual =
      this.obtenerFechaSinHora(
        new Date()
      );

    const fechaCaducidad =
      this.obtenerFechaSinHora(
        this.crearFechaLocal(
          producto.fecha_caducidad
        )
      );

    const diferencia =
      fechaCaducidad.getTime()
      - fechaActual.getTime();

    return Math.ceil(
      diferencia
      / (
        1000
        * 60
        * 60
        * 24
      )
    );

  }

  obtenerTextoAlerta(
    producto: Producto
  ): string {

    if (
      this.estaVencido(
        producto
      )
    ) {

      const dias =
        Math.abs(
          this.obtenerDiasParaVencer(
            producto
          ) ?? 0
        );

      if (dias === 1) {

        return (
          'El producto venció hace 1 día.'
        );

      }

      return (
        `El producto venció hace ${dias} días.`
      );

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return (
        'El producto no tiene unidades disponibles.'
      );

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return (
        `Quedan ${producto.stock_producto} unidades. `
        + `El mínimo configurado es ${producto.stock_minimo_producto}.`
      );

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      const dias =
        this.obtenerDiasParaVencer(
          producto
        ) ?? 0;

      if (dias === 0) {

        return (
          'El producto vence hoy.'
        );

      }

      if (dias === 1) {

        return (
          'El producto vence mañana.'
        );

      }

      return (
        `El producto vence en ${dias} días.`
      );

    }

    return (
      'El producto requiere revisión.'
    );

  }

  obtenerTituloAlerta(
    producto: Producto
  ): string {

    if (
      this.estaVencido(
        producto
      )
    ) {

      return 'Producto vencido';

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return 'Producto agotado';

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return 'Stock bajo';

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      return 'Producto por vencer';

    }

    return 'Alerta de inventario';

  }

  obtenerClaseAlerta(
    producto: Producto
  ): string {

    if (
      this.estaVencido(
        producto
      )
    ) {

      return 'alerta-vencido';

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return 'alerta-agotado';

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return 'alerta-stock-bajo';

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      return 'alerta-por-vencer';

    }

    return 'alerta-general';

  }

  obtenerIconoAlerta(
    producto: Producto
  ): string {

    if (
      this.estaVencido(
        producto
      )
    ) {

      return 'event_busy';

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return 'remove_shopping_cart';

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return 'warning';

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      return 'schedule';

    }

    return 'notifications';

  }

  obtenerTextoDisponibilidad(
    producto: Producto
  ): string {

    if (!producto.estado) {

      return 'Inactivo';

    }

    if (
      this.estaVencido(
        producto
      )
    ) {

      return 'Vencido';

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return 'Agotado';

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return 'Stock bajo';

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      return 'Por vencer';

    }

    return 'Disponible';

  }

  obtenerClaseDisponibilidad(
    producto: Producto
  ): string {

    if (!producto.estado) {

      return 'inactivo';

    }

    if (
      this.estaVencido(
        producto
      )
    ) {

      return 'vencido';

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return 'agotado';

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return 'stock-bajo';

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      return 'por-vencer';

    }

    return 'disponible';

  }

  obtenerIconoDisponibilidad(
    producto: Producto
  ): string {

    if (!producto.estado) {

      return 'block';

    }

    if (
      this.estaVencido(
        producto
      )
    ) {

      return 'event_busy';

    }

    if (
      this.esAgotado(
        producto
      )
    ) {

      return 'remove_shopping_cart';

    }

    if (
      this.esStockBajo(
        producto
      )
    ) {

      return 'warning';

    }

    if (
      this.estaProximoAVencer(
        producto
      )
    ) {

      return 'schedule';

    }

    return 'check_circle';

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

  private actualizarProductoEnLista(
    productoActualizado: Producto
  ): void {

    this.productos =
      this.productos.map(
        (producto) => {

          if (
            producto.id_producto
            === productoActualizado
              .id_producto
          ) {

            return productoActualizado;

          }

          return producto;

        }
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

  private coincideFiltroDisponibilidad(
    producto: Producto
  ): boolean {

    switch (
      this.filtroDisponibilidad
    ) {

      case 'disponible':

        return this.estaDisponible(
          producto
        );

      case 'stock_bajo':

        return this.esStockBajo(
          producto
        );

      case 'agotado':

        return this.esAgotado(
          producto
        );

      case 'por_vencer':

        return this.estaProximoAVencer(
          producto
        );

      case 'vencido':

        return this.estaVencido(
          producto
        );

      case 'inactivo':

        return !producto.estado;

      default:

        return true;

    }

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

  private obtenerFechaSinHora(
    fecha: Date
  ): Date {

    return new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      fecha.getDate()
    );

  }

}