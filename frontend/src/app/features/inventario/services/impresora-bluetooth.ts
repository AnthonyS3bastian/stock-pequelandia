import {
  Injectable,
  signal
} from '@angular/core';

interface FiltroPuertoSerial {
  usbVendorId?: number;
  usbProductId?: number;
  bluetoothServiceClassId?:
    string | number;
}

interface OpcionesSolicitudPuertoSerial {
  filters?: FiltroPuertoSerial[];

  allowedBluetoothServiceClassIds?:
    string[];
}

interface InformacionPuertoSerial {
  usbVendorId?: number;
  usbProductId?: number;

  bluetoothServiceClassId?:
    string | number;
}

interface OpcionesAperturaPuertoSerial {
  baudRate: number;

  bufferSize?: number;

  dataBits?: 7 | 8;

  stopBits?: 1 | 2;

  parity?:
    | 'none'
    | 'even'
    | 'odd';

  flowControl?:
    | 'none'
    | 'hardware';
}

interface PuertoSerial {

  readonly readable:
    ReadableStream<Uint8Array> | null;

  readonly writable:
    WritableStream<Uint8Array> | null;

  open(
    opciones:
      OpcionesAperturaPuertoSerial
  ): Promise<void>;

  close(): Promise<void>;

  getInfo():
    InformacionPuertoSerial;
}

interface SerialNavegador
extends EventTarget {

  requestPort(
    opciones?:
      OpcionesSolicitudPuertoSerial
  ): Promise<PuertoSerial>;

  getPorts():
    Promise<PuertoSerial[]>;
}

interface NavegadorConSerial
extends Navigator {

  serial?: SerialNavegador;
}

type ProgresoImpresion = (
  porcentaje: number
) => void;

@Injectable({
  providedIn: 'root'
})
export class ImpresoraBluetoothService {

  /*
  |--------------------------------------------------------------------------
  | Perfil Bluetooth Classic SPP
  |--------------------------------------------------------------------------
  |
  | Este es el perfil identificado en la captura del celular:
  | JL_SPP / RFCOMM.
  |
  */

  private readonly perfilSerialBluetooth =
    '00001101-0000-1000-8000-00805f9b34fb';

  /*
  |--------------------------------------------------------------------------
  | Configuración física de la impresora
  |--------------------------------------------------------------------------
  */

  private readonly anchoImpresora =
    384;

  private readonly velocidadPuerto =
    115200;

  private readonly tamanoBloque =
    512;

  private puerto:
    PuertoSerial | null =
      null;

  private eventosRegistrados =
    false;

  /*
  |--------------------------------------------------------------------------
  | Estado público
  |--------------------------------------------------------------------------
  */

  private readonly conectadaSignal =
    signal(false);

  private readonly nombreSignal =
    signal(
      'Impresora YHK'
    );

  private readonly imprimiendoSignal =
    signal(false);

  readonly conectada =
    this.conectadaSignal
      .asReadonly();

  readonly nombre =
    this.nombreSignal
      .asReadonly();

  readonly imprimiendo =
    this.imprimiendoSignal
      .asReadonly();

  /*
  |--------------------------------------------------------------------------
  | Desconexión física
  |--------------------------------------------------------------------------
  */

  private readonly manejarDesconexion =
    (): void => {

      this.puerto =
        null;

      this.conectadaSignal.set(
        false
      );

      this.imprimiendoSignal.set(
        false
      );

    };

  /*
  |--------------------------------------------------------------------------
  | Compatibilidad
  |--------------------------------------------------------------------------
  */

  esCompatible(): boolean {

    return Boolean(
      (
        navigator as
          NavegadorConSerial
      ).serial
    );

  }

  estaConectada(): boolean {

    return Boolean(
      this.conectadaSignal()
      && this.puerto
      && this.puerto.writable
    );

  }

  obtenerNombre(): string {

    return this.nombreSignal();

  }

  /*
  |--------------------------------------------------------------------------
  | Conexión
  |--------------------------------------------------------------------------
  */

  async conectar():
    Promise<string> {

    const serial =
      (
        navigator as
          NavegadorConSerial
      ).serial;

    if (!serial) {

      throw new Error(
        'Este navegador no permite Web Serial. '
        + 'Abre el sistema en Google Chrome o Microsoft Edge '
        + 'desde localhost o HTTPS.'
      );

    }

    this.registrarEventos(
      serial
    );

    /*
     * Si ya está abierto, no mostramos
     * nuevamente el selector.
     */
    if (
      this.puerto
      && this.puerto.writable
    ) {

      this.conectadaSignal.set(
        true
      );

      return this.obtenerNombre();

    }

    /*
     * Primero intentamos recuperar
     * un puerto autorizado anteriormente.
     */
    let puerto =
      await this
        .buscarPuertoAutorizado(
          serial
        );

    /*
     * Si todavía no tiene permiso,
     * Chrome mostrará el selector.
     */
    if (!puerto) {

      puerto =
        await this.solicitarPuerto(
          serial
        );

    }

    try {

      await this.abrirPuerto(
        puerto
      );

    } catch (error) {

      this.puerto =
        null;

      this.conectadaSignal.set(
        false
      );

      throw this
        .normalizarErrorConexion(
          error
        );

    }

    this.puerto =
      puerto;

    this.nombreSignal.set(
      'YHK-3FD5 / JL_SPP'
    );

    this.conectadaSignal.set(
      true
    );

    return this.obtenerNombre();

  }

  /*
  |--------------------------------------------------------------------------
  | Desconexión manual
  |--------------------------------------------------------------------------
  */

  desconectar(): void {

    const puertoActual =
      this.puerto;

    this.puerto =
      null;

    this.conectadaSignal.set(
      false
    );

    this.imprimiendoSignal.set(
      false
    );

    if (!puertoActual) {

      return;

    }

    void this.cerrarPuerto(
      puertoActual
    );

  }

  /*
  |--------------------------------------------------------------------------
  | Impresión de prueba
  |--------------------------------------------------------------------------
  |
  | Utiliza exactamente el mismo tipo de comandos ESC/POS
  | detectado en la impresión correcta de WalkPrint:
  |
  | ESC @
  | texto
  | saltos de línea
  |
  */

  async imprimirPruebaTexto():
    Promise<void> {

    this.validarDisponible();

    if (
      this.imprimiendoSignal()
    ) {

      throw new Error(
        'Ya existe una impresion en curso.'
      );

    }

    this.imprimiendoSignal.set(
      true
    );

    try {

      const ahora =
        new Intl.DateTimeFormat(
          'es-PE',
          {
            dateStyle: 'short',
            timeStyle: 'medium',
            timeZone:
              'America/Lima'
          }
        ).format(
          new Date()
        );

      const trabajo =
        this.concatenar([

          /*
           * ESC @
           * Inicializar impresora.
           */
          new Uint8Array([
            0x1b,
            0x40
          ]),

          this.codificarAscii(
            'PRUEBA PEQUELANDIA\n'
          ),

          this.codificarAscii(
            '123456789\n'
          ),

          this.codificarAscii(
            `${ahora}\n`
          ),

          this.codificarAscii(
            '--------------------------\n'
          ),

          /*
           * Avance final de papel.
           */
          new Uint8Array([
            0x0a,
            0x0a,
            0x0a,
            0x0a
          ])

        ]);

      await this.enviarDatos(
        trabajo
      );

    } finally {

      this.imprimiendoSignal.set(
        false
      );

    }

  }

  /*
  |--------------------------------------------------------------------------
  | Impresión de etiqueta
  |--------------------------------------------------------------------------
  */

  async imprimirCanvas(
    canvas: HTMLCanvasElement,
    copias = 1,
    alProgresar?: ProgresoImpresion
  ): Promise<void> {

    this.validarDisponible();

    if (
      this.imprimiendoSignal()
    ) {

      throw new Error(
        'Ya existe una impresion en curso.'
      );

    }

    const cantidad =
      Math.min(
        Math.max(
          Math.trunc(
            copias
          ),
          1
        ),
        100
      );

    const raster =
      this.convertirCanvasAEscPos(
        canvas,
        170
      );

    this.imprimiendoSignal.set(
      true
    );

    try {

      for (
        let copia = 0;
        copia < cantidad;
        copia += 1
      ) {

        /*
         * Trabajo detectado en WalkPrint:
         *
         * ESC @
         * GS v 0
         * imagen raster
         * cuatro saltos de línea
         */
        const trabajo =
          this.concatenar([

            new Uint8Array([
              0x1b,
              0x40
            ]),

            raster,

            new Uint8Array([
              0x0a,
              0x0a,
              0x0a,
              0x0a
            ])

          ]);

        await this.enviarDatos(
          trabajo,
          porcentajeCopia => {

            const porcentajeTotal =
              Math.round(
                (
                  copia
                  + porcentajeCopia
                    / 100
                )
                / cantidad
                * 100
              );

            alProgresar?.(
              Math.min(
                porcentajeTotal,
                100
              )
            );

          }
        );

        if (
          copia
          < cantidad - 1
        ) {

          await this.esperar(
            300
          );

        }

      }

      alProgresar?.(
        100
      );

    } finally {

      this.imprimiendoSignal.set(
        false
      );

    }

  }

  /*
  |--------------------------------------------------------------------------
  | Eventos de Web Serial
  |--------------------------------------------------------------------------
  */

  private registrarEventos(
    serial: SerialNavegador
  ): void {

    if (
      this.eventosRegistrados
    ) {

      return;

    }

    serial.addEventListener(
      'disconnect',
      this.manejarDesconexion
    );

    this.eventosRegistrados =
      true;

  }

  /*
  |--------------------------------------------------------------------------
  | Recuperar puerto autorizado
  |--------------------------------------------------------------------------
  */

  private async buscarPuertoAutorizado(
    serial: SerialNavegador
  ): Promise<PuertoSerial | null> {

    const puertos =
      await serial.getPorts();

    for (
      const puerto
      of puertos
    ) {

      const informacion =
        puerto.getInfo();

      if (
        this.esPerfilSerialBluetooth(
          informacion
            .bluetoothServiceClassId
        )
      ) {

        return puerto;

      }

    }

    return null;

  }

  /*
  |--------------------------------------------------------------------------
  | Selector de puerto
  |--------------------------------------------------------------------------
  */

  private async solicitarPuerto(
    serial: SerialNavegador
  ): Promise<PuertoSerial> {

    try {

      return await serial
        .requestPort({

          allowedBluetoothServiceClassIds: [
            this
              .perfilSerialBluetooth
          ],

          filters: [
            {
              bluetoothServiceClassId:
                this
                  .perfilSerialBluetooth
            }
          ]

        });

    } catch (error) {

      if (
        error instanceof
          DOMException
        && error.name ===
          'NotFoundError'
      ) {

        throw new Error(
          'No se selecciono la impresora. '
          + 'En la ventana de Chrome elige '
          + 'YHK-3FD5 o JL_SPP.'
        );

      }

      /*
       * Compatibilidad con versiones
       * de Chrome que no acepten filtros.
       */
      if (
        error instanceof TypeError
      ) {

        return serial
          .requestPort();

      }

      throw error;

    }

  }

  /*
  |--------------------------------------------------------------------------
  | Abrir puerto RFCOMM
  |--------------------------------------------------------------------------
  */

  private async abrirPuerto(
    puerto: PuertoSerial
  ): Promise<void> {

    /*
     * Si writable existe,
     * el puerto ya está abierto.
     */
    if (
      puerto.writable
    ) {

      return;

    }

    await this.conTiempoLimite(

      puerto.open({
        baudRate:
          this.velocidadPuerto,

        bufferSize:
          65536,

        dataBits:
          8,

        stopBits:
          1,

        parity:
          'none',

        flowControl:
          'none'
      }),

      15000,

      'La impresora tardo demasiado '
      + 'en abrir el puerto Bluetooth serial.'

    );

  }

  /*
  |--------------------------------------------------------------------------
  | Cerrar puerto
  |--------------------------------------------------------------------------
  */

  private async cerrarPuerto(
    puerto: PuertoSerial
  ): Promise<void> {

    try {

      if (
        puerto.readable
        || puerto.writable
      ) {

        await puerto.close();

      }

    } catch (error) {

      console.warn(
        'No se pudo cerrar completamente '
        + 'el puerto serial.',
        error
      );

    }

  }

  /*
  |--------------------------------------------------------------------------
  | Validar conexión
  |--------------------------------------------------------------------------
  */

  private validarDisponible():
    void {

    if (
      !this.puerto
      || !this.puerto.writable
      || !this.conectadaSignal()
    ) {

      throw new Error(
        'Primero conecta la impresora YHK '
        + 'por el puerto Bluetooth serial.'
      );

    }

  }

  /*
  |--------------------------------------------------------------------------
  | Canvas a ESC/POS raster
  |--------------------------------------------------------------------------
  |
  | Ancho:
  | 384 píxeles.
  |
  | 384 / 8:
  | 48 bytes por línea.
  |
  | Comando:
  | GS v 0 m xL xH yL yH
  |
  */

  private convertirCanvasAEscPos(
    canvasOriginal:
      HTMLCanvasElement,
    umbral: number
  ): Uint8Array {

    const proporcion =
      this.anchoImpresora
      / canvasOriginal.width;

    const alto =
      Math.max(
        1,
        Math.round(
          canvasOriginal.height
          * proporcion
        )
      );

    const canvas =
      document.createElement(
        'canvas'
      );

    canvas.width =
      this.anchoImpresora;

    canvas.height =
      alto;

    const contexto =
      canvas.getContext(
        '2d',
        {
          willReadFrequently:
            true
        }
      );

    if (!contexto) {

      throw new Error(
        'No se pudo preparar '
        + 'la imagen de la etiqueta.'
      );

    }

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

    /*
     * Escalamos la etiqueta
     * al ancho real de impresión.
     */
    contexto.drawImage(
      canvasOriginal,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const imagen =
      contexto.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );

    const bytesPorLinea =
      Math.ceil(
        canvas.width / 8
      );

    const datos =
      new Uint8Array(
        bytesPorLinea
        * canvas.height
      );

    for (
      let y = 0;
      y < canvas.height;
      y += 1
    ) {

      for (
        let x = 0;
        x < canvas.width;
        x += 1
      ) {

        const indicePixel =
          (
            y
            * canvas.width
            + x
          ) * 4;

        const rojo =
          imagen.data[
            indicePixel
          ];

        const verde =
          imagen.data[
            indicePixel + 1
          ];

        const azul =
          imagen.data[
            indicePixel + 2
          ];

        const alfa =
          imagen.data[
            indicePixel + 3
          ];

        const gris =
          alfa === 0
            ? 255
            : Math.round(
                rojo * 0.299
                + verde * 0.587
                + azul * 0.114
              );

        /*
         * Un bit en 1 significa
         * punto negro.
         */
        if (
          gris < umbral
        ) {

          const indiceByte =
            y
            * bytesPorLinea
            + Math.floor(
                x / 8
              );

          datos[indiceByte] |=
            0x80
            >> (x % 8);

        }

      }

    }

    const xL =
      bytesPorLinea
      & 0xff;

    const xH =
      (
        bytesPorLinea
        >> 8
      ) & 0xff;

    const yL =
      canvas.height
      & 0xff;

    const yH =
      (
        canvas.height
        >> 8
      ) & 0xff;

    const cabecera =
      new Uint8Array([
        0x1d,
        0x76,
        0x30,
        0x00,
        xL,
        xH,
        yL,
        yH
      ]);

    return this.concatenar([
      cabecera,
      datos
    ]);

  }

  /*
  |--------------------------------------------------------------------------
  | Enviar datos al puerto serial
  |--------------------------------------------------------------------------
  */

  private async enviarDatos(
    datos: Uint8Array,
    alProgresar?:
      ProgresoImpresion
  ): Promise<void> {

    const puerto =
      this.puerto;

    const writable =
      puerto?.writable;

    if (
      !puerto
      || !writable
    ) {

      this.manejarDesconexion();

      throw new Error(
        'La impresora se desconecto '
        + 'antes de enviar los datos.'
      );

    }

    /*
     * Web Serial exige bloquear
     * temporalmente el stream.
     */
    const escritor =
      writable.getWriter();

    try {

      alProgresar?.(
        0
      );

      const totalBloques =
        Math.ceil(
          datos.length
          / this.tamanoBloque
        );

      for (
        let bloque = 0;
        bloque < totalBloques;
        bloque += 1
      ) {

        const inicio =
          bloque
          * this.tamanoBloque;

        const fin =
          Math.min(
            inicio
            + this.tamanoBloque,
            datos.length
          );

        const fragmento =
          new Uint8Array(
            datos.slice(
              inicio,
              fin
            )
          );

        await this.conTiempoLimite(

          escritor.write(
            fragmento
          ),

          7000,

          'La impresora no recibio '
          + 'uno de los bloques enviados.'

        );

        alProgresar?.(
          Math.round(
            (
              bloque + 1
            )
            / totalBloques
            * 100
          )
        );

        if (
          bloque
          < totalBloques - 1
        ) {

          await this.esperar(
            3
          );

        }

      }

    } catch (error) {

      if (
        !puerto.writable
      ) {

        this.manejarDesconexion();

      }

      throw error;

    } finally {

      escritor.releaseLock();

    }

    await this.esperar(
      250
    );

  }

  /*
  |--------------------------------------------------------------------------
  | Texto ASCII
  |--------------------------------------------------------------------------
  */

  private codificarAscii(
    texto: string
  ): Uint8Array {

    const resultado =
      new Uint8Array(
        texto.length
      );

    for (
      let indice = 0;
      indice < texto.length;
      indice += 1
    ) {

      const codigo =
        texto.charCodeAt(
          indice
        );

      resultado[indice] =
        codigo >= 32
        && codigo <= 126
          ? codigo
          : codigo === 10
            ? 10
            : 63;

    }

    return resultado;

  }

  /*
  |--------------------------------------------------------------------------
  | Concatenar arrays
  |--------------------------------------------------------------------------
  */

  private concatenar(
    partes: Uint8Array[]
  ): Uint8Array {

    const longitud =
      partes.reduce(
        (
          acumulado,
          parte
        ) =>
          acumulado
          + parte.length,
        0
      );

    const resultado =
      new Uint8Array(
        longitud
      );

    let posicion =
      0;

    for (
      const parte
      of partes
    ) {

      resultado.set(
        parte,
        posicion
      );

      posicion +=
        parte.length;

    }

    return resultado;

  }

  /*
  |--------------------------------------------------------------------------
  | Identificar SPP
  |--------------------------------------------------------------------------
  */

  private esPerfilSerialBluetooth(
    identificador:
      string
      | number
      | undefined
  ): boolean {

    if (
      identificador
        === undefined
      || identificador
        === null
    ) {

      return false;

    }

    if (
      typeof identificador
        === 'number'
    ) {

      return (
        identificador
        === 0x1101
      );

    }

    const normalizado =
      identificador
        .trim()
        .toLowerCase();

    return (
      normalizado ===
        '1101'
      || normalizado ===
        '0x1101'
      || normalizado ===
        this
          .perfilSerialBluetooth
    );

  }

  /*
  |--------------------------------------------------------------------------
  | Mensajes de conexión
  |--------------------------------------------------------------------------
  */

  private normalizarErrorConexion(
    error: unknown
  ): Error {

    if (
      error instanceof
        DOMException
    ) {

      if (
        error.name ===
          'NetworkError'
      ) {

        return new Error(
          'No se pudo abrir JL_SPP. '
          + 'Apaga el Bluetooth del celular, '
          + 'cierra WalkPrint, enciende nuevamente '
          + 'la impresora y vuelve a conectar.'
        );

      }

      if (
        error.name ===
          'InvalidStateError'
      ) {

        return new Error(
          'El puerto Bluetooth ya esta '
          + 'siendo utilizado por otra '
          + 'aplicacion o pestana.'
        );

      }

      if (
        error.name ===
          'SecurityError'
      ) {

        return new Error(
          'Chrome bloqueo Web Serial. '
          + 'Abre el sistema desde localhost '
          + 'o HTTPS y concede el permiso.'
        );

      }

    }

    if (
      error instanceof Error
    ) {

      return error;

    }

    return new Error(
      'No se pudo conectar '
      + 'la impresora Bluetooth serial.'
    );

  }

  /*
  |--------------------------------------------------------------------------
  | Tiempo límite
  |--------------------------------------------------------------------------
  */

  private conTiempoLimite<T>(
    promesa: Promise<T>,
    milisegundos: number,
    mensaje: string
  ): Promise<T> {

    return new Promise<T>(
      (
        resolver,
        rechazar
      ) => {

        const temporizador =
          window.setTimeout(
            () => {

              rechazar(
                new Error(
                  mensaje
                )
              );

            },
            milisegundos
          );

        promesa.then(
          valor => {

            window.clearTimeout(
              temporizador
            );

            resolver(
              valor
            );

          },
          error => {

            window.clearTimeout(
              temporizador
            );

            rechazar(
              error
            );

          }
        );

      }
    );

  }

  /*
  |--------------------------------------------------------------------------
  | Pausa
  |--------------------------------------------------------------------------
  */

  private esperar(
    milisegundos: number
  ): Promise<void> {

    return new Promise(
      resolver => {

        window.setTimeout(
          resolver,
          milisegundos
        );

      }
    );

  }

}