import {
  Injectable
} from '@angular/core';

export interface BarraCodigo {
  x: number;
  ancho: number;
}

export interface CodigoBarrasGenerado {
  codigo: string;
  barras: BarraCodigo[];
  anchoTotal: number;
  valido: boolean;
  mensaje: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CodigoBarrasService {

  private readonly patrones: string[] = [
    '212222', '222122', '222221', '121223', '121322',
    '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231',
    '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222',
    '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123',
    '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131',
    '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123',
    '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422',
    '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211',
    '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112',
    '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141',
    '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214',
    '211232', '2331112'
  ];

  generarCode128B(
    codigoOriginal: string
  ): CodigoBarrasGenerado {

    const codigo =
      codigoOriginal.trim();

    if (!codigo) {

      return {
        codigo,
        barras: [],
        anchoTotal: 0,
        valido: false,
        mensaje:
          'El producto no tiene un codigo para generar la etiqueta.'
      };

    }

    const valores: number[] = [];

    for (const caracter of codigo) {

      const valorAscii =
        caracter.charCodeAt(0);

      if (
        valorAscii < 32
        || valorAscii > 126
      ) {

        return {
          codigo,
          barras: [],
          anchoTotal: 0,
          valido: false,
          mensaje:
            'El codigo contiene caracteres que Code 128 no puede imprimir.'
        };

      }

      valores.push(
        valorAscii - 32
      );

    }

    const inicioCode128B = 104;

    let sumaChecksum =
      inicioCode128B;

    valores.forEach(
      (valor, indice) => {

        sumaChecksum +=
          valor * (indice + 1);

      }
    );

    const checksum =
      sumaChecksum % 103;

    const simbolos = [
      inicioCode128B,
      ...valores,
      checksum,
      106
    ];

    const margenSilencioso = 10;

    const barras: BarraCodigo[] = [];

    let posicionX =
      margenSilencioso;

    for (const simbolo of simbolos) {

      const patron =
        this.patrones[simbolo];

      for (
        let indice = 0;
        indice < patron.length;
        indice += 1
      ) {

        const ancho =
          Number(patron[indice]);

        const esBarra =
          indice % 2 === 0;

        if (esBarra) {

          barras.push({
            x: posicionX,
            ancho
          });

        }

        posicionX += ancho;

      }

    }

    return {
      codigo,
      barras,
      anchoTotal:
        posicionX
        + margenSilencioso,
      valido: true,
      mensaje: null
    };

  }

  crearSvg(
    codigo: string,
    altura = 58
  ): string {

    const generado =
      this.generarCode128B(
        codigo
      );

    if (!generado.valido) {

      return '';

    }

    const rectangulos =
      generado.barras
        .map(
          barra =>
            `<rect x="${barra.x}" y="0" width="${barra.ancho}" height="${altura}" />`
        )
        .join('');

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" `
      + `viewBox="0 0 ${generado.anchoTotal} ${altura}" `
      + `preserveAspectRatio="none" role="img" `
      + `aria-label="Codigo de barras ${this.escaparHtml(codigo)}">`
      + `<g fill="#000000">${rectangulos}</g>`
      + '</svg>'
    );

  }

  escaparHtml(
    valor: string
  ): string {

    return valor
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  }

}
