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
  FormsModule
} from '@angular/forms';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatButtonModule
} from '@angular/material/button';

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

type TipoMensaje =
  | 'exito'
  | 'error'
  | 'informacion';

@Component({
  selector: 'app-etiqueta-producto',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule
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

  @Input({
    required: true
  })
  producto!: Producto;

  @Output()
  cerrar =
    new EventEmitter<void>();

  readonly nombreNegocio =
    'Pequelandia A & A';

  readonly anchoRolloMm =
    57;

  readonly altoEtiquetaAproximadoMm =
    30;

  readonly maximoEtiquetas =
    10;

  numeroCopias =
    1;

  codigoBarras:
    CodigoBarrasGenerado = {
      codigo: '',
      barras: [],
      anchoTotal: 0,
      valido: false,
      mensaje: null
    };

  mensajeEstado =
    '';

  tipoMensaje:
    TipoMensaje =
      'informacion';

  conectandoBluetooth =
    false;

  imprimiendoBluetooth =
    false;

  ngOnChanges(
    cambios: SimpleChanges
  ): void {
    if (
      cambios['producto']
      && this.producto
    ) {
      this.numeroCopias =
        1;

      this.mensajeEstado =
        '';

      this.tipoMensaje =
        'informacion';

      this.codigoBarras =
        this.codigoBarrasService
          .generarCode128B(
            this.producto
              .codigo_producto
          );
    }
  }

  get bluetoothCompatible():
    boolean {
    return this.impresoraBluetooth
      .esCompatible();
  }

  get bluetoothConectado():
    boolean {
    return this.impresoraBluetooth
      .estaConectada();
  }

  get nombreImpresoraBluetooth():
    string {
    return this.impresoraBluetooth
      .obtenerNombre();
  }

  get operacionEnCurso():
    boolean {
    return (
      this.conectandoBluetooth
      || this.imprimiendoBluetooth
    );
  }

  get textoBotonImprimir():
    string {
    if (this.imprimiendoBluetooth) {
      return 'Imprimiendo...';
    }

    if (this.numeroCopias === 1) {
      return 'Imprimir etiqueta';
    }

    return `Imprimir ${this.numeroCopias} etiquetas`;
  }

  cerrarVista(): void {
    if (this.operacionEnCurso) {
      return;
    }

    this.cerrar.emit();
  }

  aumentarCopias(): void {
    if (
      this.operacionEnCurso
      || this.numeroCopias
        >= this.maximoEtiquetas
    ) {
      return;
    }

    this.numeroCopias +=
      1;
  }

  disminuirCopias(): void {
    if (
      this.operacionEnCurso
      || this.numeroCopias <= 1
    ) {
      return;
    }

    this.numeroCopias -=
      1;
  }

  limitarCopias(): void {
    const cantidad =
      Math.trunc(
        Number(
          this.numeroCopias
        )
      );

    if (
      Number.isNaN(cantidad)
      || !Number.isFinite(cantidad)
    ) {
      this.numeroCopias =
        1;

      return;
    }

    this.numeroCopias =
      Math.min(
        Math.max(
          cantidad,
          1
        ),
        this.maximoEtiquetas
      );
  }

  async conectarBluetooth():
    Promise<void> {
    if (
      this.conectandoBluetooth
      || this.imprimiendoBluetooth
    ) {
      return;
    }

    if (!this.bluetoothCompatible) {
      this.establecerMensaje(
        'Este navegador no permite Web Bluetooth. Utilice Google Chrome o Microsoft Edge.',
        'error'
      );

      return;
    }

    this.mensajeEstado =
      '';

    this.conectandoBluetooth =
      true;

    try {
      const nombre =
        await this
          .impresoraBluetooth
          .conectar();

      this.establecerMensaje(
        `${nombre} conectada correctamente.`,
        'exito'
      );
    } catch (error) {
      this.establecerMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo conectar la impresora Bluetooth.'
        ),
        'error'
      );
    } finally {
      this.conectandoBluetooth =
        false;
    }
  }

  desconectarBluetooth():
    void {
    if (this.operacionEnCurso) {
      return;
    }

    this.impresoraBluetooth
      .desconectar();

    this.establecerMensaje(
      'Impresora Bluetooth desconectada.',
      'informacion'
    );
  }

  async imprimirBluetoothDirecto():
    Promise<void> {
    if (
      this.imprimiendoBluetooth
      || this.conectandoBluetooth
    ) {
      return;
    }

    this.limitarCopias();

    if (!this.codigoBarras.valido) {
      this.establecerMensaje(
        this.codigoBarras.mensaje
        ?? 'No se pudo generar el código de barras.',
        'error'
      );

      return;
    }

    if (!this.bluetoothCompatible) {
      this.establecerMensaje(
        'Este navegador no permite Web Bluetooth. Utilice Google Chrome o Microsoft Edge.',
        'error'
      );

      return;
    }

    this.imprimiendoBluetooth =
      true;

    this.establecerMensaje(
      this.numeroCopias === 1
        ? 'Preparando etiqueta...'
        : `Preparando ${this.numeroCopias} etiquetas...`,
      'informacion'
    );

    try {
      if (!this.bluetoothConectado) {
        await this
          .impresoraBluetooth
          .conectar();
      }

      /*
       * Se crea un único lienzo vertical
       * con todas las etiquetas.
       *
       * Esto evita enviar el mismo trabajo
       * varias veces y evita que las
       * impresiones se superpongan.
       */
      const canvas =
        this.crearCanvasEtiquetas(
          this.numeroCopias
        );

      await this
        .impresoraBluetooth
        .imprimirCanvas(
          canvas,
          1,
          porcentaje => {
            this.establecerMensaje(
              `Enviando etiquetas... ${porcentaje}%`,
              'informacion'
            );
          }
        );

      this.establecerMensaje(
        this.numeroCopias === 1
          ? 'Etiqueta impresa correctamente.'
          : `${this.numeroCopias} etiquetas impresas correctamente.`,
        'exito'
      );
    } catch (error) {
      this.establecerMensaje(
        this.obtenerMensajeError(
          error,
          'No se pudo imprimir la etiqueta.'
        ),
        'error'
      );
    } finally {
      this.imprimiendoBluetooth =
        false;
    }
  }

  formatearPrecio(
    valor: number
  ): string {
    return `S/ ${
      Number(
        valor ?? 0
      ).toFixed(2)
    }`;
  }

  private crearCanvasEtiquetas(
    cantidad: number
  ): HTMLCanvasElement {
    /*
     * La impresora utiliza un ancho
     * imprimible de 384 píxeles.
     *
     * Cada etiqueta ocupa una sección
     * vertical completa del papel.
     *
     * Entre etiquetas se deja un espacio
     * en blanco para facilitar el corte.
     */
    const anchoPapel =
      384;

    const altoEtiqueta =
      206;

    const espacioEntreEtiquetas =
      20;

    const margenSuperior =
      4;

    const margenInferior =
      8;

    const altoCanvas =
      margenSuperior
      + cantidad
        * altoEtiqueta
      + Math.max(
          cantidad - 1,
          0
        )
        * espacioEntreEtiquetas
      + margenInferior;

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      anchoPapel;

    canvas.height =
      altoCanvas;

    const contexto =
      canvas.getContext(
        '2d'
      );

    if (!contexto) {
      throw new Error(
        'No se pudo preparar la impresión de etiquetas.'
      );
    }

    contexto.fillStyle =
      '#ffffff';

    contexto.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    contexto.imageSmoothingEnabled =
      false;

    for (
      let indice = 0;
      indice < cantidad;
      indice += 1
    ) {
      const posicionY =
        margenSuperior
        + indice
          * (
            altoEtiqueta
            + espacioEntreEtiquetas
          );

      this.dibujarEtiqueta(
        contexto,
        posicionY,
        altoEtiqueta
      );
    }

    return canvas;
  }

  private dibujarEtiqueta(
    contexto:
      CanvasRenderingContext2D,

    posicionY: number,

    altoEtiqueta: number
  ): void {
    const margenHorizontal =
      8;

    const anchoEtiqueta =
      368;

    const centroX =
      192;

    const margenCodigo =
      24;

    const anchoCodigo =
      anchoEtiqueta
      - margenCodigo * 2;

    contexto.save();

    contexto.fillStyle =
      '#ffffff';

    contexto.fillRect(
      margenHorizontal,
      posicionY,
      anchoEtiqueta,
      altoEtiqueta
    );

    /*
     * Borde negro que servirá como guía
     * cuando se utilice papel continuo.
     */
    contexto.strokeStyle =
      '#000000';

    contexto.lineWidth =
      2;

    contexto.setLineDash([]);

    contexto.strokeRect(
      margenHorizontal + 1,
      posicionY + 1,
      anchoEtiqueta - 2,
      altoEtiqueta - 2
    );

    contexto.fillStyle =
      '#000000';

    contexto.textAlign =
      'center';

    contexto.textBaseline =
      'middle';

    this.dibujarTextoAjustado(
      contexto,
      this.nombreNegocio
        .toUpperCase(),
      centroX,
      posicionY + 18,
      anchoEtiqueta - 28,
      15,
      11,
      900
    );

    this.dibujarTextoAjustado(
      contexto,
      String(
        this.producto
          .nombre_producto
        ?? 'Producto'
      ),
      centroX,
      posicionY + 43,
      anchoEtiqueta - 30,
      19,
      12,
      850
    );

    const inicioBarras =
      posicionY + 62;

    const altoBarras =
      84;

    const escala =
      anchoCodigo
      / this.codigoBarras
        .anchoTotal;

    for (
      const barra
      of this.codigoBarras.barras
    ) {
      contexto.fillRect(
        margenHorizontal
        + margenCodigo
        + barra.x
          * escala,

        inicioBarras,

        Math.max(
          1,
          barra.ancho
            * escala
        ),

        altoBarras
      );
    }

    this.dibujarTextoAjustado(
      contexto,
      this.producto
        .codigo_producto,
      centroX,
      posicionY + 158,
      anchoEtiqueta - 34,
      14,
      10,
      750,
      'monospace'
    );

    this.dibujarTextoAjustado(
      contexto,
      this.formatearPrecio(
        this.producto
          .precio_producto
      ),
      centroX,
      posicionY + 185,
      anchoEtiqueta - 34,
      26,
      20,
      900
    );

    contexto.restore();
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

    familia =
      'Arial'
  ): void {
    const textoOriginal =
      String(
        texto ?? ''
      )
        .trim();

    let tamano =
      tamanoInicial;

    contexto.font =
      `${peso} ${tamano}px ${familia}`;

    while (
      tamano > tamanoMinimo
      && contexto
        .measureText(
          textoOriginal
        )
        .width
        > anchoMaximo
    ) {
      tamano -=
        1;

      contexto.font =
        `${peso} ${tamano}px ${familia}`;
    }

    let textoFinal =
      textoOriginal;

    while (
      textoFinal.length > 1
      && contexto
        .measureText(
          textoFinal
        )
        .width
        > anchoMaximo
    ) {
      textoFinal =
        `${textoFinal.slice(
          0,
          -2
        )}…`;
    }

    contexto.fillText(
      textoFinal || '-',
      x,
      y
    );
  }

  private establecerMensaje(
    mensaje: string,
    tipo: TipoMensaje
  ): void {
    this.mensajeEstado =
      mensaje;

    this.tipoMensaje =
      tipo;
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
        return 'No se seleccionó una impresora Bluetooth.';
      }

      return error.message;
    }

    return mensajeDefecto;
  }

}