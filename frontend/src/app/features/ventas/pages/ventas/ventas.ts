import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  MatCardModule
} from '@angular/material/card';

import {
  MatFormFieldModule
} from '@angular/material/form-field';

import {
  MatInputModule
} from '@angular/material/input';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatTableModule
} from '@angular/material/table';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  firstValueFrom
} from 'rxjs';

import {
  ProductoService
} from '../../../inventario/services/producto';

import {
  TipoComprobante,
  RegistrarVentaRequest,
  VentaRegistrada
} from '../../interfaces/comprobante-venta.interface';

import {
  VentaService
} from '../../services/ventas.service';

import {
  ComprobanteTermicoService
} from '../../services/comprobante-termico.service';

interface ProductoVenta {
  id_producto: number;
  codigo: string;
  producto: string;
  cantidad: number;
  precio: number;
  subtotal: number;
  stockDisponible: number;
  fechaCaducidad?: string | null;
  estado: boolean;
}

type VistaVentas =
  | 'nueva'
  | 'anular';

type EstadoConsultaDocumento =
  | 'inicial'
  | 'consultando'
  | 'encontrado'
  | 'no_encontrado'
  | 'advertencia'
  | 'error';

type TipoNotificacion =
  | 'exito'
  | 'advertencia'
  | 'error'
  | 'informacion';

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
export class Ventas
implements OnInit, OnDestroy {

  @ViewChild('campoCodigo')
  campoCodigo?: ElementRef<HTMLInputElement>;

  @ViewChild('campoComprobante')
  campoComprobante?: ElementRef<HTMLInputElement>;

  private readonly productoService =
    inject(ProductoService);

  private readonly ventaService =
    inject(VentaService);

  private readonly comprobanteTermicoService =
    inject(ComprobanteTermicoService);

  private readonly snackBar =
    inject(MatSnackBar);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private temporizadorImpresora:
    ReturnType<typeof setInterval> | null =
      null;

  private componenteDestruido = false;

  readonly displayedColumns: string[] = [
    'producto',
    'cantidad',
    'precio',
    'subtotal',
    'acciones'
  ];

  vistaActual:
    VistaVentas = 'nueva';

  ventas:
    ProductoVenta[] = [];

  codigoBarras = '';

  total = 0;

  registrando = false;

  imprimiendo = false;

  conectandoImpresora = false;

  buscandoProducto = false;

  consultandoDocumento = false;

  /*
   * Son valores internos para conservar
   * la compatibilidad con el backend:
   *
   * VENTA RAPIDA = Público general.
   * BOLETA       = Cliente con DNI.
   * FACTURA      = Cliente con RUC.
   *
   * En todos los casos se genera
   * una NOTA DE VENTA.
   */
  tipoComprobante:
    TipoComprobante = 'VENTA RAPIDA';

  numeroDocumento = '';

  nombreCliente =
    'PUBLICO GENERAL';

  direccionCliente = '';

  documentoConsultado = true;

  estadoConsultaDocumento:
    EstadoConsultaDocumento = 'inicial';

  mensajeConsultaDocumento = '';

  imprimirComprobante = true;

  confirmacionVentaVisible = false;

  advertenciaImpresoraVisible = false;

  impresoraCompatible = true;

  impresoraConectada = false;

  nombreImpresora =
    'Impresora Bluetooth';

  numeroComprobanteBusqueda = '';

  buscandoVenta = false;

  anulandoVenta = false;

  ventaBuscada:
    VentaRegistrada | null = null;

  puedeAnularVenta = false;

  motivoBloqueoAnulacion = '';

  confirmacionAnulacionVisible = false;

  ngOnInit(): void {
    this.calcularTotales();

    this.actualizarEstadoImpresora();

    this.temporizadorImpresora =
      setInterval(
        () => {
          this.actualizarEstadoImpresora();
        },
        1000
      );

    this.enfocarCampoCodigo();
  }

  ngOnDestroy(): void {
    this.componenteDestruido = true;

    if (this.temporizadorImpresora) {
      clearInterval(
        this.temporizadorImpresora
      );

      this.temporizadorImpresora = null;
    }
  }

  get cantidadProductos(): number {
    return this.ventas.length;
  }

  get cantidadUnidades(): number {
    return this.ventas.reduce(
      (acumulado, producto) =>
        acumulado + producto.cantidad,
      0
    );
  }

  get operacionEnCurso(): boolean {
    return (
      this.registrando
      || this.imprimiendo
      || this.conectandoImpresora
      || this.anulandoVenta
    );
  }

  get puedeRegistrar(): boolean {
    if (
      this.ventas.length === 0
      || this.operacionEnCurso
      || this.buscandoProducto
      || this.consultandoDocumento
    ) {
      return false;
    }

    if (
      this.tipoComprobante
      === 'BOLETA'
    ) {
      return (
        /^\d{8}$/.test(
          this.numeroDocumento
        )
        && this.documentoConsultado
      );
    }

    if (
      this.tipoComprobante
      === 'FACTURA'
    ) {
      return (
        /^\d{11}$/.test(
          this.numeroDocumento
        )
        && this.documentoConsultado
      );
    }

    return true;
  }

  get textoTipoCliente(): string {
    if (
      this.tipoComprobante
      === 'BOLETA'
    ) {
      return 'Cliente con DNI';
    }

    if (
      this.tipoComprobante
      === 'FACTURA'
    ) {
      return 'Cliente con RUC';
    }

    return 'Venta rápida';
  }

  actualizarEstadoImpresora(
    mostrarMensaje = false
  ): void {
    const estadoAnterior =
      this.impresoraConectada;

    const nombreAnterior =
      this.nombreImpresora;

    this.impresoraCompatible =
      this.comprobanteTermicoService
        .esCompatible();

    this.impresoraConectada =
      this.comprobanteTermicoService
        .estaConectada();

    this.nombreImpresora =
      this.comprobanteTermicoService
        .obtenerNombreImpresora()
      || 'Impresora Bluetooth';

    if (mostrarMensaje) {
      this.mostrarMensaje(
        this.impresoraConectada
          ? `${this.nombreImpresora} está conectada.`
          : 'La impresora no está conectada.',
        this.impresoraConectada
          ? 'exito'
          : 'informacion'
      );
    }

    const estadoCambio =
      estadoAnterior
        !== this.impresoraConectada
      || nombreAnterior
        !== this.nombreImpresora;

    if (
      estadoCambio
      && !this.componenteDestruido
    ) {
      this.cdr.detectChanges();
    }
  }

  async conectarImpresora():
    Promise<void> {
    if (
      this.conectandoImpresora
      || this.registrando
      || this.imprimiendo
    ) {
      return;
    }

    if (
      !this.comprobanteTermicoService
        .esCompatible()
    ) {
      this.mostrarMensaje(
        'Este navegador no permite Web Bluetooth. Utilice Google Chrome o Microsoft Edge.',
        'error'
      );

      return;
    }

    this.conectandoImpresora = true;
    this.cdr.detectChanges();

    try {
      const nombre =
        await this
          .comprobanteTermicoService
          .conectarImpresora();

      this.actualizarEstadoImpresora();

      this.mostrarMensaje(
        `${nombre} conectada correctamente.`,
        'exito'
      );
    } catch (error) {
      this.actualizarEstadoImpresora();

      this.mostrarMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo conectar la impresora.'
        ),
        'error'
      );
    } finally {
      this.conectandoImpresora = false;

      if (!this.componenteDestruido) {
        this.cdr.detectChanges();
      }
    }
  }

  desconectarImpresora(): void {
    if (
      this.conectandoImpresora
      || this.registrando
      || this.imprimiendo
    ) {
      return;
    }

    this.comprobanteTermicoService
      .desconectarImpresora();

    this.actualizarEstadoImpresora();

    this.mostrarMensaje(
      'Impresora desconectada.',
      'informacion'
    );
  }

  cambiarVista(
    vista: VistaVentas
  ): void {
    if (this.operacionEnCurso) {
      return;
    }

    this.vistaActual = vista;

    this.cerrarConfirmacionVenta();
    this.cerrarConfirmacionAnulacion();

    this.advertenciaImpresoraVisible =
      false;

    if (vista === 'nueva') {
      this.enfocarCampoCodigo();
    } else {
      this.enfocarCampoComprobante();
    }
  }

  agregarProducto(): void {
    if (
      this.operacionEnCurso
      || this.buscandoProducto
    ) {
      return;
    }

    const codigo =
      this.codigoBarras.trim();

    if (!codigo) {
      this.mostrarMensaje(
        'Ingrese o escanee un código de producto.',
        'advertencia'
      );

      this.enfocarCampoCodigo();
      return;
    }

    this.buscandoProducto = true;

    this.productoService
      .buscarPorCodigo(codigo)
      .subscribe({
        next: (respuesta: any) => {
          const producto = respuesta?.data;

          if (!producto) {
            this.mostrarMensaje(
              'Producto no encontrado.',
              'advertencia'
            );

            this.finalizarBusquedaProducto();
            return;
          }

          if (!producto.estado) {
            this.mostrarMensaje(
              'El producto se encuentra inactivo.',
              'advertencia'
            );

            this.finalizarBusquedaProducto();
            return;
          }

          if (
            this.estaVencido(
              producto.fecha_caducidad
            )
          ) {
            this.mostrarMensaje(
              'El producto se encuentra vencido y no puede venderse.',
              'advertencia'
            );

            this.finalizarBusquedaProducto();
            return;
          }

          const stockDisponible = Number(
            producto.stock_producto ?? 0
          );

          if (stockDisponible <= 0) {
            this.mostrarMensaje(
              'El producto no tiene stock disponible.',
              'advertencia'
            );

            this.finalizarBusquedaProducto();
            return;
          }

          const existente =
            this.ventas.find(
              item =>
                item.id_producto
                === Number(
                  producto.id_producto
                )
            );

          if (existente) {
            if (
              existente.cantidad
              >= existente.stockDisponible
            ) {
              this.mostrarMensaje(
                `Stock máximo disponible: ${existente.stockDisponible} unidades.`,
                'advertencia'
              );

              this.finalizarBusquedaProducto();
              return;
            }

            existente.cantidad += 1;

            existente.subtotal =
              existente.cantidad
              * existente.precio;
          } else {
            const precio = Number(
              producto.precio_producto ?? 0
            );

            this.ventas.push({
              id_producto: Number(
                producto.id_producto
              ),

              codigo: String(
                producto.codigo_producto
                ?? codigo
              ),

              producto: String(
                producto.nombre_producto
                ?? 'Producto'
              ),

              cantidad: 1,

              precio,

              subtotal: precio,

              stockDisponible,

              fechaCaducidad:
                producto.fecha_caducidad
                ?? null,

              estado: Boolean(
                producto.estado
              )
            });
          }

          this.actualizarVentaTemporal();
          this.finalizarBusquedaProducto();
        },

        error: (error: any) => {
          this.mostrarMensaje(
            this.obtenerMensajeError(
              error,
              error?.status === 404
                ? 'Producto no encontrado.'
                : 'No se pudo consultar el producto.'
            ),

            error?.status === 404
              ? 'advertencia'
              : 'error'
          );

          this.finalizarBusquedaProducto();
        }
      });
  }

  aumentarCantidad(
    producto: ProductoVenta
  ): void {
    if (this.operacionEnCurso) {
      return;
    }

    if (
      producto.cantidad
      >= producto.stockDisponible
    ) {
      this.mostrarMensaje(
        `Stock máximo disponible: ${producto.stockDisponible} unidades.`,
        'advertencia'
      );

      return;
    }

    producto.cantidad += 1;

    producto.subtotal =
      producto.cantidad
      * producto.precio;

    this.actualizarVentaTemporal();
  }

  disminuirCantidad(
    producto: ProductoVenta
  ): void {
    if (this.operacionEnCurso) {
      return;
    }

    if (producto.cantidad > 1) {
      producto.cantidad -= 1;

      producto.subtotal =
        producto.cantidad
        * producto.precio;

      this.actualizarVentaTemporal();
      return;
    }

    this.eliminarProducto(
      producto
    );
  }

  eliminarProducto(
    producto: ProductoVenta
  ): void {
    if (this.operacionEnCurso) {
      return;
    }

    this.ventas =
      this.ventas.filter(
        item =>
          item.id_producto
          !== producto.id_producto
      );

    this.calcularTotales();
    this.enfocarCampoCodigo();
  }

  limpiarVenta(): void {
    if (this.operacionEnCurso) {
      return;
    }

    this.ventas = [];
    this.codigoBarras = '';

    this.calcularTotales();
    this.enfocarCampoCodigo();
  }

  seleccionarTipoComprobante(
    tipo: TipoComprobante
  ): void {
    if (
      this.operacionEnCurso
      || this.consultandoDocumento
    ) {
      return;
    }

    this.tipoComprobante = tipo;

    this.numeroDocumento = '';
    this.direccionCliente = '';

    this.estadoConsultaDocumento =
      'inicial';

    this.mensajeConsultaDocumento = '';

    if (
      tipo === 'VENTA RAPIDA'
    ) {
      this.nombreCliente =
        'PUBLICO GENERAL';

      this.documentoConsultado = true;
    } else {
      this.nombreCliente = '';
      this.documentoConsultado = false;
    }

    this.cdr.detectChanges();
  }

  limpiarNumeroDocumento(): void {
    this.numeroDocumento =
      this.numeroDocumento.replace(
        /\D/g,
        ''
      );

    const longitudMaxima =
      this.tipoComprobante
      === 'FACTURA'
        ? 11
        : 8;

    this.numeroDocumento =
      this.numeroDocumento.substring(
        0,
        longitudMaxima
      );

    this.nombreCliente = '';
    this.direccionCliente = '';

    this.documentoConsultado = false;

    this.estadoConsultaDocumento =
      'inicial';

    this.mensajeConsultaDocumento = '';
  }

  consultarDocumento(): void {
    if (
      this.tipoComprobante
        === 'VENTA RAPIDA'
      || this.consultandoDocumento
      || this.operacionEnCurso
    ) {
      return;
    }

    const documento =
      this.numeroDocumento.trim();

    if (
      this.tipoComprobante
        === 'BOLETA'
      && !/^\d{8}$/.test(
        documento
      )
    ) {
      this.establecerEstadoDocumento(
        'advertencia',
        'El DNI debe contener exactamente 8 dígitos.'
      );

      return;
    }

    if (
      this.tipoComprobante
        === 'FACTURA'
      && !/^\d{11}$/.test(
        documento
      )
    ) {
      this.establecerEstadoDocumento(
        'advertencia',
        'El RUC debe contener exactamente 11 dígitos.'
      );

      return;
    }

    this.consultandoDocumento = true;
    this.documentoConsultado = false;

    this.nombreCliente = '';
    this.direccionCliente = '';

    this.establecerEstadoDocumento(
      'consultando',

      this.tipoComprobante
        === 'BOLETA'
        ? 'Consultando DNI...'
        : 'Consultando RUC...'
    );

    if (
      this.tipoComprobante
      === 'BOLETA'
    ) {
      this.consultarDni(
        documento
      );
    } else {
      this.consultarRuc(
        documento
      );
    }
  }

  abrirConfirmacionVenta(): void {
    if (!this.puedeRegistrar) {
      this.validarVentaAntesDeConfirmar();
      return;
    }

    this.actualizarEstadoImpresora();

    this.confirmacionVentaVisible = true;
  }

  cerrarConfirmacionVenta(): void {
    if (this.operacionEnCurso) {
      return;
    }

    this.confirmacionVentaVisible = false;
  }

  async confirmarVenta():
    Promise<void> {
    if (
      !this.confirmacionVentaVisible
      || !this.puedeRegistrar
      || this.operacionEnCurso
    ) {
      return;
    }

    this.actualizarEstadoImpresora();

    if (
      this.imprimirComprobante
      && !this.impresoraConectada
    ) {
      this.confirmacionVentaVisible =
        false;

      this.advertenciaImpresoraVisible =
        true;

      return;
    }

    await this.registrarVentaConfirmada(
      this.imprimirComprobante
    );
  }

  cerrarAdvertenciaImpresora(): void {
    if (this.operacionEnCurso) {
      return;
    }

    this.advertenciaImpresoraVisible =
      false;

    this.confirmacionVentaVisible =
      true;
  }

  async conectarYContinuarVenta():
    Promise<void> {
    if (this.operacionEnCurso) {
      return;
    }

    await this.conectarImpresora();

    this.actualizarEstadoImpresora();

    if (!this.impresoraConectada) {
      return;
    }

    this.advertenciaImpresoraVisible =
      false;

    await this.registrarVentaConfirmada(
      true
    );
  }

  async continuarSinImprimir():
    Promise<void> {
    if (this.operacionEnCurso) {
      return;
    }

    this.advertenciaImpresoraVisible =
      false;

    this.imprimirComprobante = false;

    await this.registrarVentaConfirmada(
      false
    );
  }

  private async registrarVentaConfirmada(
    debeImprimir: boolean
  ): Promise<void> {
    if (
      !this.puedeRegistrar
      || this.operacionEnCurso
    ) {
      return;
    }

    this.confirmacionVentaVisible =
      false;

    this.advertenciaImpresoraVisible =
      false;

    try {
      const datos =
        this.construirSolicitudVenta();

      this.registrando = true;
      this.cdr.detectChanges();

      const respuesta =
        await firstValueFrom(
          this.ventaService
            .registrar(datos)
        );

      this.registrando = false;

      let mensaje =
        respuesta.mensaje
        || 'Venta registrada correctamente.';

      let tipoMensaje:
        TipoNotificacion = 'exito';

      if (debeImprimir) {
        try {
          this.imprimiendo = true;
          this.cdr.detectChanges();

          await this
            .comprobanteTermicoService
            .imprimirComprobante(
              respuesta.venta
            );

          mensaje +=
            ' Nota de venta impresa correctamente.';
        } catch (error) {
          mensaje =
            'Venta registrada correctamente, pero no se pudo imprimir la nota de venta. '
            + this.obtenerMensajeError(
              error,
              'Revise la conexión de la impresora.'
            );

          tipoMensaje =
            'advertencia';
        } finally {
          this.imprimiendo = false;
        }
      }

      this.mostrarMensaje(
        mensaje,
        tipoMensaje
      );

      this.reiniciarVentaCompleta();

      this.actualizarEstadoImpresora();

      this.cdr.detectChanges();
      this.enfocarCampoCodigo();
    } catch (error) {
      this.registrando = false;
      this.imprimiendo = false;

      this.mostrarMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo registrar la venta.'
        ),
        'error'
      );

      this.cdr.detectChanges();
    }
  }

  normalizarNumeroComprobante(): void {
    this.numeroComprobanteBusqueda =
      this.numeroComprobanteBusqueda
        .toUpperCase()
        .replace(
          /[^A-Z0-9]/g,
          ''
        )
        .substring(
          0,
          20
        );

    this.ventaBuscada = null;
    this.puedeAnularVenta = false;
    this.motivoBloqueoAnulacion = '';
  }

  async buscarVentaParaAnular():
    Promise<void> {
    const numero =
      this.numeroComprobanteBusqueda
        .trim()
        .toUpperCase();

    if (!numero) {
      this.mostrarMensaje(
        'Ingrese o escanee el código de la nota de venta.',
        'advertencia'
      );

      this.enfocarCampoComprobante();
      return;
    }

    if (
      this.buscandoVenta
      || this.operacionEnCurso
    ) {
      return;
    }

    this.buscandoVenta = true;

    this.ventaBuscada = null;
    this.puedeAnularVenta = false;
    this.motivoBloqueoAnulacion = '';

    this.cdr.detectChanges();

    try {
      const respuesta =
        await firstValueFrom(
          this.ventaService
            .buscarPorComprobante(
              numero
            )
        );

      this.ventaBuscada =
        respuesta.venta;

      this.puedeAnularVenta =
        respuesta.puede_anular;

      this.motivoBloqueoAnulacion =
        respuesta.motivo_bloqueo
        ?? '';
    } catch (error) {
      this.mostrarMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo buscar la nota de venta.'
        ),
        'error'
      );
    } finally {
      this.buscandoVenta = false;
      this.cdr.detectChanges();
    }
  }

  abrirConfirmacionAnulacion(): void {
    if (
      !this.ventaBuscada
      || !this.puedeAnularVenta
      || this.operacionEnCurso
    ) {
      return;
    }

    this.confirmacionAnulacionVisible =
      true;
  }

  cerrarConfirmacionAnulacion(): void {
    if (
      this.anulandoVenta
    ) {
      return;
    }

    this.confirmacionAnulacionVisible =
      false;
  }

  async confirmarAnulacion():
    Promise<void> {
    if (
      !this.ventaBuscada
      || !this.puedeAnularVenta
      || this.anulandoVenta
    ) {
      return;
    }

    this.anulandoVenta = true;
    this.cdr.detectChanges();

    try {
      const respuesta =
        await firstValueFrom(
          this.ventaService
            .anularPorComprobante(
              this.ventaBuscada
                .numero_comprobante
            )
        );

      this.ventaBuscada =
        respuesta.venta;

      this.puedeAnularVenta =
        false;

      this.motivoBloqueoAnulacion =
        'La venta ya se encuentra anulada.';

      this.confirmacionAnulacionVisible =
        false;

      this.mostrarMensaje(
        respuesta.mensaje,
        'exito'
      );
    } catch (error) {
      this.mostrarMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo anular la venta.'
        ),
        'error'
      );
    } finally {
      this.anulandoVenta = false;
      this.cdr.detectChanges();
    }
  }

  obtenerCantidadUnidadesVenta(
    venta: VentaRegistrada
  ): number {
    return (
      venta.detalle_ventas
      ?? []
    ).reduce(
      (
        acumulado,
        detalle
      ) =>
        acumulado
        + Number(
          detalle
            .cantidad_detalle_venta
          ?? 0
        ),
      0
    );
  }

  obtenerNombreClienteVenta(
    venta: VentaRegistrada
  ): string {
    const cliente =
      venta.cliente;

    if (!cliente) {
      return 'PUBLICO GENERAL';
    }

    const opciones = [
      cliente.nombre_cliente,

      cliente.razon_social_cliente,

      cliente.nombre_razon_social,

      [
        cliente.nombres_cliente,

        cliente.apellidos_cliente
          ?? cliente.apellido_cliente
      ]
        .filter(Boolean)
        .join(' ')
    ];

    return String(
      opciones.find(
        valor =>
          String(
            valor ?? ''
          ).trim()
      )
      ?? 'PUBLICO GENERAL'
    ).trim();
  }

  obtenerNombreVendedorVenta(
    venta: VentaRegistrada
  ): string {
    const personal =
      venta.usuario?.personal;

    const nombre = [
      personal?.nombre_personal,

      personal?.apellido_personal
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return nombre
      || venta.usuario?.nombre_usuario
      || 'Usuario';
  }

  formatearFechaHora(
    fecha: string
  ): string {
    return new Intl.DateTimeFormat(
      'es-PE',
      {
        timeZone:
          'America/Lima',

        dateStyle:
          'short',

        timeStyle:
          'medium'
      }
    ).format(
      new Date(fecha)
    );
  }

  calcularTotales(): void {
    this.total =
      this.ventas.reduce(
        (
          acumulado,
          producto
        ) =>
          acumulado
          + Number(
            producto.subtotal
          ),
        0
      );
  }

  private consultarDni(
    dni: string
  ): void {
    this.ventaService
      .consultarDni(dni)
      .subscribe({
        next: (respuesta) => {
          const datos =
            respuesta?.datos;

          const nombre = [
            datos?.nombres,

            datos?.apellidoPaterno,

            datos?.apellidoMaterno
          ]
            .filter(Boolean)
            .join(' ')
            .trim();

          if (!nombre) {
            this.consultandoDocumento =
              false;

            this.documentoConsultado =
              false;

            this.establecerEstadoDocumento(
              'no_encontrado',
              'No se encontró información para el DNI ingresado.'
            );

            this.cdr.detectChanges();
            return;
          }

          this.nombreCliente =
            nombre;

          this.direccionCliente =
            '';

          this.documentoConsultado =
            true;

          this.consultandoDocumento =
            false;

          this.establecerEstadoDocumento(
            'encontrado',
            'Cliente encontrado correctamente.'
          );

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          this.procesarErrorDocumento(
            error,
            'DNI'
          );
        }
      });
  }

  private consultarRuc(
    ruc: string
  ): void {
    this.ventaService
      .consultarRuc(ruc)
      .subscribe({
        next: (respuesta) => {
          const datos =
            respuesta?.datos;

          if (
            !datos?.razonSocial
          ) {
            this.consultandoDocumento =
              false;

            this.documentoConsultado =
              false;

            this.establecerEstadoDocumento(
              'no_encontrado',
              'No se encontró información para el RUC ingresado.'
            );

            this.cdr.detectChanges();
            return;
          }

          this.nombreCliente =
            datos.razonSocial;

          this.direccionCliente =
            datos.direccion
            ?? '';

          if (
            datos.estado !== 'ACTIVO'
          ) {
            this.consultandoDocumento =
              false;

            this.documentoConsultado =
              false;

            this.establecerEstadoDocumento(
              'advertencia',
              `El RUC tiene estado ${datos.estado || 'desconocido'}.`
            );

            this.cdr.detectChanges();
            return;
          }

          if (
            datos.condicion !== 'HABIDO'
          ) {
            this.consultandoDocumento =
              false;

            this.documentoConsultado =
              false;

            this.establecerEstadoDocumento(
              'advertencia',
              `El RUC tiene condición ${datos.condicion || 'desconocida'}.`
            );

            this.cdr.detectChanges();
            return;
          }

          this.documentoConsultado =
            true;

          this.consultandoDocumento =
            false;

          this.establecerEstadoDocumento(
            'encontrado',
            'Empresa encontrada correctamente.'
          );

          this.cdr.detectChanges();
        },

        error: (error: any) => {
          this.procesarErrorDocumento(
            error,
            'RUC'
          );
        }
      });
  }

  private procesarErrorDocumento(
    error: any,
    tipoDocumento: 'DNI' | 'RUC'
  ): void {
    this.consultandoDocumento =
      false;

    this.documentoConsultado =
      false;

    this.nombreCliente = '';
    this.direccionCliente = '';

    const estadoHttp =
      Number(
        error?.status ?? 0
      );

    if (
      estadoHttp === 404
    ) {
      this.establecerEstadoDocumento(
        'no_encontrado',
        `No se encontró información para el ${tipoDocumento} ingresado.`
      );
    } else if (
      estadoHttp === 400
      || estadoHttp === 422
    ) {
      this.establecerEstadoDocumento(
        'advertencia',

        this.obtenerMensajeError(
          error,
          `El ${tipoDocumento} ingresado no es válido.`
        )
      );
    } else {
      this.establecerEstadoDocumento(
        'error',

        this.obtenerMensajeError(
          error,
          `No se pudo consultar el ${tipoDocumento}.`
        )
      );
    }

    this.cdr.detectChanges();
  }

  private validarVentaAntesDeConfirmar(): void {
    if (
      this.ventas.length === 0
    ) {
      this.mostrarMensaje(
        'Debe agregar al menos un producto.',
        'advertencia'
      );

      return;
    }

    if (
      this.tipoComprobante
        === 'BOLETA'
      && !this.numeroDocumento
    ) {
      this.establecerEstadoDocumento(
        'advertencia',
        'Ingrese y consulte el DNI del cliente.'
      );

      return;
    }

    if (
      this.tipoComprobante
        === 'FACTURA'
      && !this.numeroDocumento
    ) {
      this.establecerEstadoDocumento(
        'advertencia',
        'Ingrese y consulte el RUC del cliente.'
      );

      return;
    }

    if (
      this.tipoComprobante
        !== 'VENTA RAPIDA'
      && !this.documentoConsultado
    ) {
      this.establecerEstadoDocumento(
        'advertencia',

        this.tipoComprobante
          === 'BOLETA'
          ? 'Consulte el DNI antes de registrar la venta.'
          : 'Consulte el RUC antes de registrar la venta.'
      );
    }
  }

  private construirSolicitudVenta():
    RegistrarVentaRequest {
    return {
      tipo_comprobante:
        this.tipoComprobante,

      numero_documento:
        this.numeroDocumento.trim()
          ? this.numeroDocumento.trim()
          : null,

      detalles:
        this.ventas.map(
          producto => ({
            id_producto:
              producto.id_producto,

            cantidad:
              producto.cantidad
          })
        )
    };
  }

  private actualizarVentaTemporal(): void {
    this.ventas = [
      ...this.ventas
    ];

    this.calcularTotales();
  }

  private finalizarBusquedaProducto(): void {
    this.buscandoProducto = false;

    this.codigoBarras = '';

    this.cdr.detectChanges();
    this.enfocarCampoCodigo();
  }

  private reiniciarVentaCompleta(): void {
    this.ventas = [];

    this.codigoBarras = '';

    this.total = 0;

    this.tipoComprobante =
      'VENTA RAPIDA';

    this.numeroDocumento = '';

    this.nombreCliente =
      'PUBLICO GENERAL';

    this.direccionCliente = '';

    this.documentoConsultado =
      true;

    this.consultandoDocumento =
      false;

    this.buscandoProducto =
      false;

    this.estadoConsultaDocumento =
      'inicial';

    this.mensajeConsultaDocumento =
      '';

    this.imprimirComprobante =
      true;

    this.confirmacionVentaVisible =
      false;

    this.advertenciaImpresoraVisible =
      false;
  }

  private establecerEstadoDocumento(
    estado: EstadoConsultaDocumento,
    mensaje: string
  ): void {
    this.estadoConsultaDocumento =
      estado;

    this.mensajeConsultaDocumento =
      mensaje;
  }

  private estaVencido(
    fechaCaducidad:
      string | null | undefined
  ): boolean {
    if (!fechaCaducidad) {
      return false;
    }

    const fecha =
      new Date(
        `${String(fechaCaducidad).substring(0, 10)}T00:00:00`
      );

    const hoy =
      new Date();

    hoy.setHours(
      0,
      0,
      0,
      0
    );

    return fecha.getTime()
      < hoy.getTime();
  }

  private enfocarCampoCodigo(): void {
    setTimeout(
      () => {
        this.campoCodigo
          ?.nativeElement
          .focus();
      },
      100
    );
  }

  private enfocarCampoComprobante(): void {
    setTimeout(
      () => {
        this.campoComprobante
          ?.nativeElement
          .focus();
      },
      100
    );
  }

  private obtenerMensajeError(
    error: any,
    mensajePredeterminado: string
  ): string {
    if (
      error instanceof Error
    ) {
      return error.message
        || mensajePredeterminado;
    }

    if (
      error?.error?.mensaje
    ) {
      return error.error.mensaje;
    }

    if (
      error?.error?.message
    ) {
      return error.error.message;
    }

    if (
      error?.error?.errors
    ) {
      const errores =
        Object.values(
          error.error.errors
        );

      const primerError =
        errores[0];

      if (
        Array.isArray(
          primerError
        )
      ) {
        return String(
          primerError[0]
        );
      }

      if (primerError) {
        return String(
          primerError
        );
      }
    }

    return mensajePredeterminado;
  }

  private mostrarMensaje(
    mensaje: string,
    tipo:
      TipoNotificacion =
        'informacion'
  ): void {
    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 6000,

        horizontalPosition:
          'right',

        verticalPosition:
          'bottom',

        panelClass: [
          'notificacion-sistema',
          `notificacion-${tipo}`
        ]
      }
    );
  }

}