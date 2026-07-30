import {
  Injectable,
  inject
} from '@angular/core';

import {
  DATOS_NEGOCIO
} from '../config/datos-negocio';

import {
  DetalleVentaResponse,
  VentaRegistrada
} from '../interfaces/comprobante-venta.interface';

import {
  ImpresoraBluetoothService
} from '../../inventario/services/impresora-bluetooth';

import {
  CodigoBarrasService
} from '../../inventario/services/codigo-barras';

import {
  NumeroALetrasService
} from './numero-a-letras.service';

@Injectable({
  providedIn: 'root'
})
export class ComprobanteTermicoService {

  private readonly impresora =
    inject(ImpresoraBluetoothService);

  private readonly codigoBarrasService =
    inject(CodigoBarrasService);

  private readonly numeroALetrasService =
    inject(NumeroALetrasService);

  private readonly anchoPapel =
    384;

  esCompatible(): boolean {
    return this.impresora
      .esCompatible();
  }

  estaConectada(): boolean {
    return this.impresora
      .estaConectada();
  }

  obtenerNombreImpresora(): string {
    return this.impresora
      .obtenerNombre();
  }

  async conectarImpresora():
    Promise<string> {
    return this.impresora
      .conectar();
  }

  desconectarImpresora(): void {
    this.impresora
      .desconectar();
  }

  async prepararImpresora():
    Promise<string> {
    if (this.estaConectada()) {
      return this
        .obtenerNombreImpresora();
    }

    return this
      .conectarImpresora();
  }

  async imprimirComprobante(
    venta: VentaRegistrada
  ): Promise<void> {
    if (!this.estaConectada()) {
      throw new Error(
        'La impresora Bluetooth no está conectada.'
      );
    }

    const canvas =
      await this.crearNotaVenta(
        venta
      );

    await this.impresora
      .imprimirCanvas(
        canvas,
        1
      );
  }

  private async crearNotaVenta(
    venta: VentaRegistrada
  ): Promise<HTMLCanvasElement> {
    const detalles =
      venta.detalle_ventas
      ?? [];

    const altoEstimado =
      900
      + detalles.length * 100;

    const canvasTemporal =
      document.createElement(
        'canvas'
      );

    canvasTemporal.width =
      this.anchoPapel;

    canvasTemporal.height =
      altoEstimado;

    const contexto =
      canvasTemporal.getContext(
        '2d'
      );

    if (!contexto) {
      throw new Error(
        'No se pudo preparar la nota de venta.'
      );
    }

    contexto.fillStyle =
      '#ffffff';

    contexto.fillRect(
      0,
      0,
      canvasTemporal.width,
      canvasTemporal.height
    );

    contexto.fillStyle =
      '#000000';

    contexto.textBaseline =
      'top';

    contexto.imageSmoothingEnabled =
      true;

    let y = 0;

    const logo =
      await this.cargarLogo();

    if (logo) {
      const areaLogo =
        this.obtenerAreaVisibleLogo(
          logo
        );

      const anchoMaximo =
        300;

      const altoMaximo =
        125;

      const escala =
        Math.min(
          anchoMaximo
            / areaLogo.ancho,

          altoMaximo
            / areaLogo.alto
        );

      const anchoLogo =
        areaLogo.ancho
        * escala;

      const altoLogo =
        areaLogo.alto
        * escala;

      contexto.drawImage(
        logo,
        areaLogo.x,
        areaLogo.y,
        areaLogo.ancho,
        areaLogo.alto,
        (
          this.anchoPapel
          - anchoLogo
        ) / 2,
        y,
        anchoLogo,
        altoLogo
      );

      y +=
        altoLogo
        + 3;
    }

    const nombreComercial =
      String(
        DATOS_NEGOCIO
          .nombreComercial
        ?? ''
      )
        .trim()
        .toUpperCase();

    const nombrePrincipal =
      nombreComercial
        .replace(
          /\s+A\s*&\s*A\s*$/i,
          ''
        )
        .trim()
      || nombreComercial;

    const nombreComplementario =
      /A\s*&\s*A\s*$/i
        .test(
          nombreComercial
        )
        ? 'A & A'
        : '';

    y = this.dibujarTextoCentrado(
      contexto,
      nombrePrincipal,
      y,
      18,
      900
    );

    if (nombreComplementario) {
      y = this.dibujarTextoCentrado(
        contexto,
        nombreComplementario,
        y,
        17,
        900
      );
    }

    y = this.dibujarTextoCentrado(
      contexto,
      `RUC: ${DATOS_NEGOCIO.ruc}`,
      y + 1,
      13,
      700
    );

    y = this.dibujarTextoCentrado(
      contexto,
      DATOS_NEGOCIO
        .direccion,
      y + 1,
      12,
      650
    );

    y = this.dibujarTextoCentrado(
      contexto,
      DATOS_NEGOCIO
        .ubicacion,
      y + 1,
      11,
      650
    );

    y = this.dibujarTextoCentrado(
      contexto,
      `CEL.: ${DATOS_NEGOCIO.telefono}`,
      y + 1,
      12,
      650
    );

    y += 4;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarTextoCentrado(
      contexto,
      'NOTA DE VENTA',
      y + 5,
      19,
      900
    );

    /*
     * El código se conserva internamente
     * para generar el código de barras,
     * buscar la venta y anularla.
     *
     * No se imprime como texto visible.
     */
    const codigoNota =
      this.normalizarCodigoNota(
        venta.numero_comprobante
      );

    y += 4;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarPar(
      contexto,
      'Fecha:',
      this.formatearFecha(
        venta.fecha_venta
      ),
      y + 6
    );

    y = this.dibujarPar(
      contexto,
      'Hora:',
      this.formatearHora(
        venta.fecha_venta
      ),
      y + 2
    );

    y += 4;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarTextoIzquierda(
      contexto,
      'CLIENTE',
      y + 7,
      14,
      900
    );

    const nombreCliente =
      this.obtenerNombreCliente(
        venta
      );

    y = this.dibujarTextoEnvuelto(
      contexto,
      nombreCliente,
      10,
      y + 3,
      364,
      13,
      700
    );

    const documentoCliente =
      this.obtenerDocumentoCliente(
        venta
      );

    if (documentoCliente) {
      const tipoDocumento =
        documentoCliente.length
          === 11
          ? 'RUC'
          : 'DNI';

      y = this.dibujarTextoIzquierda(
        contexto,
        `${tipoDocumento}: ${documentoCliente}`,
        y + 2,
        13,
        650
      );
    }

    const direccionCliente =
      this.obtenerDireccionCliente(
        venta
      );

    if (direccionCliente) {
      y = this.dibujarTextoEnvuelto(
        contexto,
        `DIRECCION: ${direccionCliente}`,
        10,
        y + 2,
        364,
        12,
        600
      );
    }

    y += 7;

    y = this.dibujarLinea(
      contexto,
      y
    );

    contexto.font =
      '800 12px Arial';

    contexto.textAlign =
      'left';

    contexto.fillText(
      'PRODUCTO',
      10,
      y + 7
    );

    contexto.textAlign =
      'right';

    contexto.fillText(
      'IMPORTE',
      374,
      y + 7
    );

    y += 26;

    y = this.dibujarLinea(
      contexto,
      y
    );

    for (
      const detalle
      of detalles
    ) {
      y = this.dibujarDetalle(
        contexto,
        detalle,
        y + 6
      );
    }

    y += 3;

    y = this.dibujarLinea(
      contexto,
      y
    );

    const cantidadProductos =
      detalles.length;

    const cantidadUnidades =
      detalles.reduce(
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

    y = this.dibujarPar(
      contexto,
      'Productos:',
      String(
        cantidadProductos
      ),
      y + 8
    );

    y = this.dibujarPar(
      contexto,
      'Unidades:',
      String(
        cantidadUnidades
      ),
      y + 3
    );

    y += 5;

    y = this.dibujarLinea(
      contexto,
      y
    );

    const total =
      Number(
        venta.total_venta
        ?? 0
      );

    contexto.font =
      '900 21px Arial';

    contexto.textAlign =
      'left';

    contexto.fillText(
      'TOTAL:',
      10,
      y + 10
    );

    contexto.textAlign =
      'right';

    contexto.fillText(
      this.formatearMoneda(
        total
      ),
      374,
      y + 10
    );

    y += 42;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarTextoEnvuelto(
      contexto,
      `SON: ${this.numeroALetrasService.convertirMonto(total)}`,
      10,
      y + 8,
      364,
      12,
      700
    );

    y += 7;

    y = this.dibujarTextoIzquierda(
      contexto,
      'ATENDIDO POR:',
      y,
      12,
      800
    );

    y = this.dibujarTextoEnvuelto(
      contexto,
      this.obtenerNombreVendedor(
        venta
      ),
      10,
      y + 2,
      364,
      13,
      700
    );

    y += 5;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarTextoCentrado(
      contexto,
      'GRACIAS POR SU COMPRA',
      y + 7,
      16,
      900
    );

    y += 7;

    /*
     * Código de barras Code 128.
     *
     * Se imprimen únicamente las barras.
     * El código no aparece escrito debajo.
     */
    const codigoBarras =
      this.codigoBarrasService
        .generarCode128B(
          codigoNota
        );

    if (codigoBarras.valido) {
      const anchoCodigo =
        330;

      const altoCodigo =
        66;

      const inicioX =
        (
          this.anchoPapel
          - anchoCodigo
        ) / 2;

      const escala =
        anchoCodigo
        / codigoBarras
          .anchoTotal;

      for (
        const barra
        of codigoBarras.barras
      ) {
        contexto.fillRect(
          inicioX
          + barra.x
          * escala,

          y + 6,

          Math.max(
            1,
            barra.ancho
            * escala
          ),

          altoCodigo
        );
      }

      y +=
        altoCodigo
        + 12;
    }

    y = this.dibujarTextoCentrado(
      contexto,
      'NO SE ACEPTAN CAMBIOS NI DEVOLUCIONES',
      y + 4,
      13,
      900
    );

    y = this.dibujarEmojiCentrado(
      contexto,
      '😠',
      y + 1,
      24
    );

    y += 8;

    const canvasFinal =
      document.createElement(
        'canvas'
      );

    canvasFinal.width =
      this.anchoPapel;

    canvasFinal.height =
      Math.ceil(y);

    const contextoFinal =
      canvasFinal.getContext(
        '2d'
      );

    if (!contextoFinal) {
      throw new Error(
        'No se pudo finalizar la nota de venta.'
      );
    }

    contextoFinal.fillStyle =
      '#ffffff';

    contextoFinal.fillRect(
      0,
      0,
      canvasFinal.width,
      canvasFinal.height
    );

    contextoFinal.drawImage(
      canvasTemporal,
      0,
      0
    );

    return canvasFinal;
  }

  private dibujarDetalle(
    contexto:
      CanvasRenderingContext2D,

    detalle:
      DetalleVentaResponse,

    y: number
  ): number {
    const nombreProducto =
      String(
        detalle.producto
          ?.nombre_producto
        ?? 'PRODUCTO'
      )
        .trim()
        .toUpperCase();

    const cantidad =
      Number(
        detalle
          .cantidad_detalle_venta
        ?? 0
      );

    const precioUnitario =
      Number(
        detalle
          .precio_publico_venta
        ?? detalle.producto
          ?.precio_producto
        ?? 0
      );

    const importe =
      cantidad
      * precioUnitario;

    contexto.font =
      '800 13px Arial';

    contexto.textAlign =
      'left';

    const lineasNombre =
      this.dividirTextoPorAncho(
        contexto,
        nombreProducto,
        265
      );

    for (
      let indice = 0;
      indice
        < lineasNombre.length;
      indice += 1
    ) {
      contexto.fillText(
        lineasNombre[indice],
        10,
        y
        + indice * 17
      );
    }

    contexto.textAlign =
      'right';

    contexto.fillText(
      this.formatearMoneda(
        importe
      ),
      374,
      y
    );

    y +=
      lineasNombre.length
      * 17;

    contexto.font =
      '600 12px Arial';

    contexto.textAlign =
      'left';

    contexto.fillText(
      `${cantidad} x ${this.formatearMoneda(precioUnitario)}`,
      10,
      y + 2
    );

    return y + 24;
  }

  private dibujarTextoCentrado(
    contexto:
      CanvasRenderingContext2D,

    texto: string,

    y: number,

    tamano: number,

    peso: number
  ): number {
    contexto.font =
      `${peso} ${tamano}px Arial`;

    contexto.textAlign =
      'center';

    const lineas =
      this.dividirTextoPorAncho(
        contexto,
        texto,
        360
      );

    for (
      let indice = 0;
      indice < lineas.length;
      indice += 1
    ) {
      contexto.fillText(
        lineas[indice],
        this.anchoPapel / 2,
        y
        + indice
        * (
          tamano + 3
        )
      );
    }

    return y
      + lineas.length
      * (
        tamano + 3
      );
  }

  private dibujarEmojiCentrado(
    contexto:
      CanvasRenderingContext2D,

    emoji: string,

    y: number,

    tamano: number
  ): number {
    contexto.font =
      `${tamano}px "Segoe UI Emoji", "Apple Color Emoji", Arial`;

    contexto.textAlign =
      'center';

    contexto.fillText(
      emoji,
      this.anchoPapel / 2,
      y
    );

    return y
      + tamano
      + 4;
  }

  private dibujarTextoIzquierda(
    contexto:
      CanvasRenderingContext2D,

    texto: string,

    y: number,

    tamano: number,

    peso: number
  ): number {
    contexto.font =
      `${peso} ${tamano}px Arial`;

    contexto.textAlign =
      'left';

    contexto.fillText(
      texto,
      10,
      y
    );

    return y
      + tamano
      + 4;
  }

  private dibujarTextoEnvuelto(
    contexto:
      CanvasRenderingContext2D,

    texto: string,

    x: number,

    y: number,

    anchoMaximo: number,

    tamano: number,

    peso: number
  ): number {
    contexto.font =
      `${peso} ${tamano}px Arial`;

    contexto.textAlign =
      'left';

    const lineas =
      this.dividirTextoPorAncho(
        contexto,
        texto,
        anchoMaximo
      );

    for (
      let indice = 0;
      indice < lineas.length;
      indice += 1
    ) {
      contexto.fillText(
        lineas[indice],
        x,
        y
        + indice
        * (
          tamano + 3
        )
      );
    }

    return y
      + lineas.length
      * (
        tamano + 3
      );
  }

  private dibujarPar(
    contexto:
      CanvasRenderingContext2D,

    etiqueta: string,

    valor: string,

    y: number
  ): number {
    contexto.font =
      '700 13px Arial';

    contexto.textAlign =
      'left';

    contexto.fillText(
      etiqueta,
      10,
      y
    );

    contexto.textAlign =
      'right';

    contexto.fillText(
      valor,
      374,
      y
    );

    return y + 18;
  }

  private dibujarLinea(
    contexto:
      CanvasRenderingContext2D,

    y: number
  ): number {
    contexto.fillStyle =
      '#000000';

    contexto.fillRect(
      8,
      y,
      368,
      2
    );

    return y + 4;
  }

  private dividirTextoPorAncho(
    contexto:
      CanvasRenderingContext2D,

    texto: string,

    anchoMaximo: number
  ): string[] {
    const palabras =
      String(texto ?? '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (
      palabras.length === 0
    ) {
      return ['-'];
    }

    const lineas:
      string[] = [];

    let lineaActual = '';

    for (
      const palabra
      of palabras
    ) {
      const propuesta =
        lineaActual
          ? `${lineaActual} ${palabra}`
          : palabra;

      if (
        contexto
          .measureText(
            propuesta
          )
          .width
        <= anchoMaximo
      ) {
        lineaActual =
          propuesta;
      } else {
        if (lineaActual) {
          lineas.push(
            lineaActual
          );
        }

        lineaActual =
          palabra;
      }
    }

    if (lineaActual) {
      lineas.push(
        lineaActual
      );
    }

    return lineas;
  }

  private async cargarLogo():
    Promise<HTMLImageElement | null> {
    try {
      return await this
        .cargarImagen(
          DATOS_NEGOCIO
            .rutaLogo
        );
    } catch {
      return null;
    }
  }

  private obtenerAreaVisibleLogo(
    logo: HTMLImageElement
  ): {
    x: number;
    y: number;
    ancho: number;
    alto: number;
  } {
    const anchoOriginal =
      logo.naturalWidth
      || logo.width;

    const altoOriginal =
      logo.naturalHeight
      || logo.height;

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      anchoOriginal;

    canvas.height =
      altoOriginal;

    const contexto =
      canvas.getContext(
        '2d',
        {
          willReadFrequently: true
        }
      );

    if (!contexto) {
      return {
        x: 0,
        y: 0,
        ancho: anchoOriginal,
        alto: altoOriginal
      };
    }

    contexto.clearRect(
      0,
      0,
      anchoOriginal,
      altoOriginal
    );

    contexto.drawImage(
      logo,
      0,
      0
    );

    const imagen =
      contexto.getImageData(
        0,
        0,
        anchoOriginal,
        altoOriginal
      );

    let minimoX =
      anchoOriginal;

    let minimoY =
      altoOriginal;

    let maximoX =
      -1;

    let maximoY =
      -1;

    for (
      let posicionY = 0;
      posicionY < altoOriginal;
      posicionY += 1
    ) {
      for (
        let posicionX = 0;
        posicionX < anchoOriginal;
        posicionX += 1
      ) {
        const indice =
          (
            posicionY
            * anchoOriginal
            + posicionX
          ) * 4;

        const rojo =
          imagen.data[indice];

        const verde =
          imagen.data[
            indice + 1
          ];

        const azul =
          imagen.data[
            indice + 2
          ];

        const alfa =
          imagen.data[
            indice + 3
          ];

        const pixelVisible =
          alfa > 20
          && (
            rojo < 248
            || verde < 248
            || azul < 248
          );

        if (!pixelVisible) {
          continue;
        }

        minimoX =
          Math.min(
            minimoX,
            posicionX
          );

        minimoY =
          Math.min(
            minimoY,
            posicionY
          );

        maximoX =
          Math.max(
            maximoX,
            posicionX
          );

        maximoY =
          Math.max(
            maximoY,
            posicionY
          );
      }
    }

    if (
      maximoX < minimoX
      || maximoY < minimoY
    ) {
      return {
        x: 0,
        y: 0,
        ancho: anchoOriginal,
        alto: altoOriginal
      };
    }

    const margen =
      2;

    const x =
      Math.max(
        0,
        minimoX - margen
      );

    const y =
      Math.max(
        0,
        minimoY - margen
      );

    const limiteX =
      Math.min(
        anchoOriginal - 1,
        maximoX + margen
      );

    const limiteY =
      Math.min(
        altoOriginal - 1,
        maximoY + margen
      );

    return {
      x,
      y,

      ancho:
        limiteX
        - x
        + 1,

      alto:
        limiteY
        - y
        + 1
    };
  }

  private cargarImagen(
    ruta: string
  ): Promise<HTMLImageElement> {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const imagen =
          new Image();

        imagen.onload =
          () =>
            resolve(imagen);

        imagen.onerror =
          () =>
            reject(
              new Error(
                'No se pudo cargar el logo.'
              )
            );

        imagen.src =
          ruta;
      }
    );
  }

  private obtenerNombreCliente(
    venta: VentaRegistrada
  ): string {
    const cliente =
      venta.cliente;

    if (!cliente) {
      return 'PUBLICO GENERAL';
    }

    const opciones = [
      cliente.nombre_cliente,

      cliente
        .razon_social_cliente,

      cliente
        .nombre_razon_social,

      [
        cliente.nombres_cliente,

        cliente
          .apellidos_cliente
          ?? cliente
            .apellido_cliente
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
    )
      .trim()
      .toUpperCase();
  }

  private obtenerDocumentoCliente(
    venta: VentaRegistrada
  ): string {
    const documento =
      String(
        venta.cliente
          ?.codigo_cliente
        ?? ''
      )
        .replace(
          /\D/g,
          ''
        )
        .trim();

    if (
      documento === ''
      || documento
        === '00000000'
    ) {
      return '';
    }

    return documento;
  }

  private obtenerDireccionCliente(
    venta: VentaRegistrada
  ): string {
    return String(
      venta.cliente
        ?.direccion_cliente
      ?? ''
    )
      .trim()
      .toUpperCase();
  }

  private obtenerNombreVendedor(
    venta: VentaRegistrada
  ): string {
    const personal =
      venta.usuario
        ?.personal;

    const nombreCompleto = [
      personal
        ?.nombre_personal,

      personal
        ?.apellido_personal
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return String(
      nombreCompleto
      || venta.usuario
        ?.nombre_usuario
      || 'USUARIO DEL SISTEMA'
    )
      .trim()
      .toUpperCase();
  }

  private normalizarCodigoNota(
    numeroComprobante: string
  ): string {
    return String(
      numeroComprobante
      ?? ''
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9]/g,
        ''
      );
  }

  private formatearFecha(
    fecha: string
  ): string {
    return new Intl
      .DateTimeFormat(
        'es-PE',
        {
          timeZone:
            'America/Lima',

          day:
            '2-digit',

          month:
            '2-digit',

          year:
            'numeric'
        }
      )
      .format(
        new Date(fecha)
      );
  }

  private formatearHora(
    fecha: string
  ): string {
    return new Intl
      .DateTimeFormat(
        'es-PE',
        {
          timeZone:
            'America/Lima',

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit',

          hour12:
            true
        }
      )
      .format(
        new Date(fecha)
      );
  }

  private formatearMoneda(
    valor: number
  ): string {
    return `S/ ${Number(valor).toFixed(2)}`;
  }

}