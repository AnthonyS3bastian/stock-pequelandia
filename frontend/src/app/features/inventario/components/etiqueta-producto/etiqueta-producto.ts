import {
  ChangeDetectorRef,
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
  FormsModule
} from '@angular/forms';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  Producto
} from '../../interfaces/producto.interface';

import {
  CodigoBarrasGenerado,
  CodigoBarrasService
} from '../../services/codigo-barras';

import {
  ImpresoraBluetoothService
} from '../../services/impresora-bluetooth';

type TamanoEtiqueta =
  | '50x30'
  | '60x40';

type TipoMensaje =
  | 'exito'
  | 'error'
  | 'informacion'
  | null;

@Component({
  selector: 'app-etiqueta-producto',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './etiqueta-producto.html',
  styleUrl: './etiqueta-producto.scss'
})
export class EtiquetaProductoComponent
implements OnChanges {

  private readonly codigoBarrasService =
    inject(CodigoBarrasService);

  private readonly impresoraBluetooth =
    inject(ImpresoraBluetoothService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  @Input({
    required: true
  })
  producto!: Producto;

  @Output()
  cerrar =
    new EventEmitter<void>();

  readonly nombreNegocio =
    'Pequelandia A & A';

  tamanoEtiqueta:
    TamanoEtiqueta = '50x30';

  numeroCopias = 1;

  codigoBarras:
    CodigoBarrasGenerado = {
      codigo: '',
      barras: [],
      anchoTotal: 0,
      valido: false,
      mensaje: null
    };

  conectandoBluetooth = false;

  imprimiendoBluetooth = false;

  mensajeEstado = '';

  tipoMensaje:
    TipoMensaje = null;

  ngOnChanges(
    cambios: SimpleChanges
  ): void {

    if (
      cambios['producto']
      && this.producto
    ) {

      this.codigoBarras =
        this.codigoBarrasService
          .generarCode128B(
            this.producto
              .codigo_producto
          );

      this.limpiarMensaje();

    }

  }

  get anchoEtiquetaMm(): number {

    return this.tamanoEtiqueta
      === '60x40'
      ? 60
      : 50;

  }

  get altoEtiquetaMm(): number {

    return this.tamanoEtiqueta
      === '60x40'
      ? 40
      : 30;

  }

  get bluetoothCompatible(): boolean {

    return this.impresoraBluetooth
      .esCompatible();

  }

  get bluetoothConectado(): boolean {

    return this.impresoraBluetooth
      .estaConectada();

  }

  get nombreImpresoraBluetooth():
    string {

    return this.impresoraBluetooth
      .obtenerNombre();

  }

  get textoBotonImprimir(): string {

    if (
      this.conectandoBluetooth
    ) {

      return 'Conectando...';

    }

    if (
      this.imprimiendoBluetooth
    ) {

      return 'Imprimiendo...';

    }

    return this.bluetoothConectado
      ? 'Imprimir etiqueta'
      : 'Conectar e imprimir';

  }

  get operacionEnCurso(): boolean {

    return (
      this.conectandoBluetooth
      || this.imprimiendoBluetooth
    );

  }

  cerrarVista(): void {

    if (
      this.operacionEnCurso
    ) {

      return;

    }

    this.cerrar.emit();

  }

  limitarCopias(): void {

    const cantidad =
      Math.trunc(
        Number(
          this.numeroCopias
        )
      );

    if (
      Number.isNaN(
        cantidad
      )
    ) {

      this.numeroCopias = 1;

      return;

    }

    this.numeroCopias =
      Math.min(
        Math.max(
          cantidad,
          1
        ),
        100
      );

  }

  async conectarBluetooth():
    Promise<void> {

    if (
      this.operacionEnCurso
      || this.bluetoothConectado
    ) {

      return;

    }

    this.limpiarMensaje();

    this.conectandoBluetooth =
      true;

    this.forzarActualizacion();

    try {

      const nombre =
        await this
          .impresoraBluetooth
          .conectar();

      this.mostrarMensaje(
        `${nombre} conectada correctamente.`,
        'exito'
      );

    } catch (error) {

      this.mostrarMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo conectar la impresora.'
        ),
        'error'
      );

    } finally {

      this.conectandoBluetooth =
        false;

      this.forzarActualizacion();

    }

  }

  desconectarBluetooth(): void {

    if (
      this.operacionEnCurso
    ) {

      return;

    }

    this.impresoraBluetooth
      .desconectar();

    this.mostrarMensaje(
      'Impresora desconectada.',
      'informacion'
    );

    this.forzarActualizacion();

  }

  async imprimirBluetoothDirecto():
    Promise<void> {

    if (
      this.operacionEnCurso
      || !this.codigoBarras.valido
      || !this.bluetoothCompatible
    ) {

      return;

    }

    this.limitarCopias();

    this.limpiarMensaje();

    try {

      if (
        !this.bluetoothConectado
      ) {

        this.conectandoBluetooth =
          true;

        this.forzarActualizacion();

        await this
          .impresoraBluetooth
          .conectar();

        this.conectandoBluetooth =
          false;

        this.forzarActualizacion();

      }

      this.imprimiendoBluetooth =
        true;

      this.mostrarMensaje(
        this.numeroCopias === 1
          ? 'Preparando la etiqueta...'
          : `Preparando ${this.numeroCopias} etiquetas...`,
        'informacion'
      );

      this.forzarActualizacion();

      await this
        .esperarRenderizado();

      const canvas =
        this
          .crearCanvasEtiquetaCompacta();

      await this
        .impresoraBluetooth
        .imprimirCanvas(
          canvas,
          this.numeroCopias
        );

      this.mostrarMensaje(
        this.numeroCopias === 1
          ? 'Etiqueta impresa correctamente.'
          : `${this.numeroCopias} etiquetas impresas correctamente.`,
        'exito'
      );

    } catch (error) {

      this.mostrarMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo imprimir la etiqueta.'
        ),
        'error'
      );

    } finally {

      this.conectandoBluetooth =
        false;

      this.imprimiendoBluetooth =
        false;

      this.forzarActualizacion();

    }

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
      Number(
        valor ?? 0
      )
    );

  }

  private crearCanvasEtiquetaCompacta():
    HTMLCanvasElement {

    const anchoPapel = 384;

    const esEtiquetaGrande =
      this.tamanoEtiqueta
      === '60x40';

    /*
     * Altura enviada a la
     * impresora térmica.
     */
    const altoPapel =
      esEtiquetaGrande
        ? 238
        : 178;

    /*
     * Ancho del contenido interno.
     * Se mantiene más pequeño que
     * el ancho completo del papel.
     */
    const anchoContenido =
      esEtiquetaGrande
        ? 326
        : 292;

    const margenHorizontal =
      Math.floor(
        (
          anchoPapel
          - anchoContenido
        ) / 2
      );

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      anchoPapel;

    canvas.height =
      altoPapel;

    const contexto =
      canvas.getContext(
        '2d'
      );

    if (
      !contexto
    ) {

      throw new Error(
        'No se pudo preparar la etiqueta.'
      );

    }

    contexto.imageSmoothingEnabled =
      false;

    /*
     * Fondo blanco.
     */
    contexto.fillStyle =
      '#ffffff';

    contexto.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    contexto.fillStyle =
      '#000000';

    contexto.textAlign =
      'center';

    contexto.textBaseline =
      'middle';

    const centroX =
      anchoPapel / 2;

    /*
     * Medidas del recuadro impreso.
     * El espacio exterior permite
     * que la dueña pueda recortarlo.
     */
    const anchoMarco =
      esEtiquetaGrande
        ? 346
        : 318;

    const altoMarco =
      esEtiquetaGrande
        ? 220
        : 164;

    const marcoX =
      Math.floor(
        (
          anchoPapel
          - anchoMarco
        ) / 2
      );

    const marcoY =
      Math.floor(
        (
          altoPapel
          - altoMarco
        ) / 2
      );

    /*
     * Posiciones verticales
     * del contenido.
     */
    const yNegocio =
      esEtiquetaGrande
        ? 21
        : 16;

    const yProducto =
      esEtiquetaGrande
        ? 45
        : 34;

    const inicioBarras =
      esEtiquetaGrande
        ? 64
        : 49;

    const altoBarras =
      esEtiquetaGrande
        ? 82
        : 57;

    const yCodigo =
      inicioBarras
      + altoBarras
      + (
        esEtiquetaGrande
          ? 14
          : 11
      );

    const yPrecio =
      altoPapel
      - (
        esEtiquetaGrande
          ? 28
          : 22
      );

    /*
     * Nombre del negocio.
     */
    this.dibujarTextoAjustado(
      contexto,
      this.nombreNegocio
        .toUpperCase(),
      centroX,
      yNegocio,
      anchoContenido,
      esEtiquetaGrande
        ? 17
        : 13,
      10,
      800
    );

    /*
     * Nombre del producto.
     */
    this.dibujarTextoAjustado(
      contexto,
      this.producto
        .nombre_producto,
      centroX,
      yProducto,
      anchoContenido,
      esEtiquetaGrande
        ? 20
        : 16,
      11,
      800
    );

    /*
     * Código de barras.
     */
    const escala =
      anchoContenido
      / this.codigoBarras
        .anchoTotal;

    for (
      const barra
      of this.codigoBarras.barras
    ) {

      contexto.fillRect(
        margenHorizontal
        + barra.x * escala,
        inicioBarras,
        Math.max(
          1,
          barra.ancho * escala
        ),
        altoBarras
      );

    }

    /*
     * Número debajo del
     * código de barras.
     */
    this.dibujarTextoAjustado(
      contexto,
      this.producto
        .codigo_producto,
      centroX,
      yCodigo,
      anchoContenido,
      esEtiquetaGrande
        ? 15
        : 12,
      9,
      700,
      'monospace'
    );

    /*
     * Precio del producto.
     */
    this.dibujarTextoAjustado(
      contexto,
      this.formatearPrecio(
        this.producto
          .precio_producto
      ),
      centroX,
      yPrecio,
      anchoContenido,
      esEtiquetaGrande
        ? 28
        : 22,
      17,
      900
    );

    /*
     * Recuadro exterior impreso.
     * Se dibuja al final para que
     * quede encima del contenido
     * y completamente visible.
     */
    contexto.strokeStyle =
      '#000000';

    contexto.lineWidth = 2;

    contexto.strokeRect(
      marcoX,
      marcoY,
      anchoMarco,
      altoMarco
    );

    return canvas;

  }

  private dibujarTextoAjustado(
    contexto:
      CanvasRenderingContext2D,
    texto: string,
    x: number,
    y: number,
    anchoMaximo: number,
    tamanoInicial: number,
    tamanoMinimo: number,
    peso: number,
    familia = 'Arial'
  ): void {

    let tamano =
      tamanoInicial;

    contexto.font =
      `${peso} ${tamano}px ${familia}`;

    while (
      tamano > tamanoMinimo
      && contexto
        .measureText(
          texto
        )
        .width > anchoMaximo
    ) {

      tamano -= 1;

      contexto.font =
        `${peso} ${tamano}px ${familia}`;

    }

    let textoFinal =
      texto;

    while (
      textoFinal.length > 1
      && contexto
        .measureText(
          textoFinal
        )
        .width > anchoMaximo
    ) {

      textoFinal =
        `${textoFinal.slice(
          0,
          -2
        )}…`;

    }

    contexto.fillText(
      textoFinal,
      x,
      y
    );

  }

  private mostrarMensaje(
    mensaje: string,
    tipo:
      Exclude<
        TipoMensaje,
        null
      >
  ): void {

    this.mensajeEstado =
      mensaje;

    this.tipoMensaje =
      tipo;

    this.forzarActualizacion();

  }

  private limpiarMensaje(): void {

    this.mensajeEstado = '';

    this.tipoMensaje = null;

  }

  private obtenerMensajeError(
    error: unknown,
    mensajeDefecto: string
  ): string {

    if (
      error instanceof Error
      && error.message
    ) {

      if (
        error.name
        === 'NotFoundError'
      ) {

        return (
          'No se selecciono una impresora.'
        );

      }

      return error.message;

    }

    return mensajeDefecto;

  }

  private forzarActualizacion(): void {

    try {

      this.cdr.detectChanges();

    } catch {

      /*
       * El componente pudo cerrarse
       * mientras terminaba una operación.
       */

    }

  }

  private esperarRenderizado():
    Promise<void> {

    return new Promise(
      resolver => {

        window.requestAnimationFrame(
          () => resolver()
        );

      }
    );

  }

}