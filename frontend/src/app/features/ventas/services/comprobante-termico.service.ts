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
      950
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

    let y = 12;

    const logo =
      await this.cargarLogo();

    if (logo) {
      const anchoMaximo =
        230;

      const altoMaximo =
        115;

      const escala =
        Math.min(
          anchoMaximo
            / logo.width,

          altoMaximo
            / logo.height
        );

      const anchoLogo =
        logo.width
        * escala;

      const altoLogo =
        logo.height
        * escala;

      contexto.drawImage(
        logo,
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
        + 10;
    }

    y = this.dibujarTextoCentrado(
      contexto,
      DATOS_NEGOCIO
        .nombreComercial,
      y,
      19,
      900
    );

    y = this.dibujarTextoCentrado(
      contexto,
      `RUC: ${DATOS_NEGOCIO.ruc}`,
      y + 2,
      13,
      700
    );

    y = this.dibujarTextoCentrado(
      contexto,
      DATOS_NEGOCIO
        .direccion,
      y + 2,
      13,
      650
    );

    y = this.dibujarTextoCentrado(
      contexto,
      DATOS_NEGOCIO
        .ubicacion,
      y + 2,
      12,
      650
    );

    y = this.dibujarTextoCentrado(
      contexto,
      `CEL.: ${DATOS_NEGOCIO.telefono}`,
      y + 2,
      13,
      650
    );

    y += 8;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarTextoCentrado(
      contexto,
      'NOTA DE VENTA',
      y + 9,
      20,
      900
    );

    const codigoNota =
      this.normalizarCodigoNota(
        venta.numero_comprobante
      );

    y = this.dibujarTextoCentrado(
      contexto,
      codigoNota,
      y + 3,
      16,
      850
    );

    y += 7;

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
      y + 8
    );

    y = this.dibujarPar(
      contexto,
      'Hora:',
      this.formatearHora(
        venta.fecha_venta
      ),
      y + 3
    );

    y += 6;

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

      y = this
        .dibujarTextoIzquierda(
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
      y = this
        .dibujarTextoEnvuelto(
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

    y += 8;

    y = this.dibujarLinea(
      contexto,
      y
    );

    y = this.dibujarTextoCentrado(
      contexto,
      'GRACIAS POR SU COMPRA',
      y + 10,
      16,
      900
    );

    y += 10;

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

          y + 12,

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
        + 18;

      y = this
        .dibujarTextoCentrado(
          contexto,
          codigoNota,
          y,
          14,
          850
        );
    }

    y += 24;

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