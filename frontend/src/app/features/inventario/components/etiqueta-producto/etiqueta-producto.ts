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

type ModoImpresion =
  | 'termica'
  | 'a4';

type TamanoEtiqueta =
  | '50x30'
  | '60x40';

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

  @Input({
    required: true
  })
  producto!: Producto;

  @Output()
  cerrar = new EventEmitter<void>();

  readonly nombreNegocio =
    'Pequelandia A & A';

  modoImpresion:
    ModoImpresion = 'termica';

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

  mensajeImpresion = '';

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

  get codigoMuyLargo(): boolean {

    return (
      this.producto
        .codigo_producto
        .trim()
        .length > 24
    );

  }

  cerrarVista(): void {

    this.cerrar.emit();

  }

  limitarCopias(): void {

    const cantidad =
      Math.trunc(
        Number(this.numeroCopias)
      );

    if (
      Number.isNaN(cantidad)
    ) {

      this.numeroCopias = 1;

      return;

    }

    this.numeroCopias =
      Math.min(
        Math.max(cantidad, 1),
        100
      );

  }

  imprimir(): void {

    this.mensajeImpresion = '';

    this.limitarCopias();

    if (!this.codigoBarras.valido) {

      this.mensajeImpresion =
        this.codigoBarras.mensaje
        ?? 'No se pudo generar el codigo de barras.';

      return;

    }

    const ventana =
      window.open(
        '',
        '_blank',
        'width=960,height=760'
      );

    if (!ventana) {

      this.mensajeImpresion =
        'El navegador bloqueo la ventana de impresion. Habilita las ventanas emergentes e intenta nuevamente.';

      return;

    }

    const contenido =
      this.crearDocumentoImpresion();

    ventana.document.open();
    ventana.document.write(contenido);
    ventana.document.close();
    ventana.focus();

    window.setTimeout(
      () => {

        ventana.print();

      },
      350
    );

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

  private crearDocumentoImpresion():
    string {

    const ancho =
      this.anchoEtiquetaMm;

    const alto =
      this.altoEtiquetaMm;

    const svg =
      this.codigoBarrasService
        .crearSvg(
          this.producto
            .codigo_producto,
          58
        );

    const nombreNegocio =
      this.codigoBarrasService
        .escaparHtml(
          this.nombreNegocio
        );

    const nombreProducto =
      this.codigoBarrasService
        .escaparHtml(
          this.producto
            .nombre_producto
        );

    const codigoProducto =
      this.codigoBarrasService
        .escaparHtml(
          this.producto
            .codigo_producto
        );

    const precio =
      this.codigoBarrasService
        .escaparHtml(
          this.formatearPrecio(
            this.producto
              .precio_producto
          )
        );

    const etiqueta =
      `<article class="etiqueta">`
      + `<div class="negocio">${nombreNegocio}</div>`
      + `<div class="producto">${nombreProducto}</div>`
      + `<div class="codigo-barras">${svg}</div>`
      + `<div class="codigo-texto">${codigoProducto}</div>`
      + `<div class="precio">${precio}</div>`
      + '</article>';

    const etiquetas =
      Array.from(
        {
          length: this.numeroCopias
        },
        () => etiqueta
      ).join('');

    const esTermica =
      this.modoImpresion
      === 'termica';

    const reglaPagina =
      esTermica
        ? `@page { size: ${ancho}mm ${alto}mm; margin: 0; }`
        : '@page { size: A4 portrait; margin: 10mm; }';

    const claseHoja =
      esTermica
        ? 'hoja termica'
        : 'hoja a4';

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Etiquetas - ${nombreProducto}</title>
<style>
  ${reglaPagina}

  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;
    background: #ffffff;
  }

  .hoja.termica {
    width: ${ancho}mm;
  }

  .hoja.a4 {
    display: grid;
    grid-template-columns: repeat(auto-fill, ${ancho}mm);
    grid-auto-rows: ${alto}mm;
    justify-content: start;
    align-content: start;
    gap: 4mm;
  }

  .etiqueta {
    position: relative;
    width: ${ancho}mm;
    height: ${alto}mm;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    overflow: hidden;
    padding: 2.2mm 2.5mm 2mm;
    border: 0.2mm solid #111111;
    background: #ffffff;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .termica .etiqueta {
    page-break-after: always;
  }

  .termica .etiqueta:last-child {
    page-break-after: auto;
  }

  .negocio {
    overflow: hidden;
    font-size: ${ancho === 60 ? 8.5 : 7.6}pt;
    font-weight: 800;
    line-height: 1;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .producto {
    margin-top: 1mm;
    overflow: hidden;
    font-size: ${ancho === 60 ? 9.5 : 8.5}pt;
    font-weight: 700;
    line-height: 1.05;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .codigo-barras {
    flex: 1;
    min-height: 10mm;
    margin: 1.2mm 0 0.5mm;
  }

  .codigo-barras svg {
    width: 100%;
    height: 100%;
    display: block;
  }

  .codigo-texto {
    overflow: hidden;
    font-family: Consolas, monospace;
    font-size: ${ancho === 60 ? 7.5 : 6.8}pt;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0.2mm;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .precio {
    margin-top: 0.8mm;
    font-size: ${ancho === 60 ? 13 : 11.5}pt;
    font-weight: 900;
    line-height: 1;
    text-align: center;
  }

  @media screen {
    body {
      padding: 12mm;
      background: #eef2f7;
    }

    .hoja {
      margin: 0 auto;
    }

    .etiqueta {
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.12);
    }
  }

  @media print {
    body {
      background: #ffffff;
    }
  }
</style>
</head>
<body>
  <main class="${claseHoja}">
    ${etiquetas}
  </main>
</body>
</html>`;

  }

}
