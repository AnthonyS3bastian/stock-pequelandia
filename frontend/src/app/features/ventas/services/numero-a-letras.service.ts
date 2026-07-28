import {
  Injectable
} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NumeroALetrasService {

  convertirMonto(
    valor: number
  ): string {

    const monto = Math.max(
      0,
      Number(valor ?? 0)
    );

    const entero = Math.floor(monto);

    const centimos = Math.round(
      (monto - entero) * 100
    );

    const textoEntero =
      this.convertirEntero(entero);

    return (
      `${textoEntero} CON `
      + `${String(centimos).padStart(2, '0')}/100 SOLES`
    ).toUpperCase();

  }

  private convertirEntero(
    numero: number
  ): string {

    if (numero === 0) {
      return 'CERO';
    }

    if (numero > 999999999) {
      return String(numero);
    }

    const millones = Math.floor(
      numero / 1000000
    );

    const restoMillones =
      numero % 1000000;

    const miles = Math.floor(
      restoMillones / 1000
    );

    const resto =
      restoMillones % 1000;

    const partes: string[] = [];

    if (millones > 0) {

      if (millones === 1) {

        partes.push('UN MILLON');

      } else {

        partes.push(
          `${this.convertirMenorAMillon(millones)} MILLONES`
        );

      }

    }

    if (miles > 0) {

      if (miles === 1) {

        partes.push('MIL');

      } else {

        partes.push(
          `${this.convertirMenorAMil(miles)} MIL`
        );

      }

    }

    if (resto > 0) {

      partes.push(
        this.convertirMenorAMil(resto)
      );

    }

    return partes.join(' ');

  }

  private convertirMenorAMillon(
    numero: number
  ): string {

    const miles = Math.floor(
      numero / 1000
    );

    const resto = numero % 1000;

    const partes: string[] = [];

    if (miles > 0) {

      if (miles === 1) {

        partes.push('MIL');

      } else {

        partes.push(
          `${this.convertirMenorAMil(miles)} MIL`
        );

      }

    }

    if (resto > 0) {

      partes.push(
        this.convertirMenorAMil(resto)
      );

    }

    return partes.join(' ');

  }

  private convertirMenorAMil(
    numero: number
  ): string {

    if (numero === 100) {
      return 'CIEN';
    }

    const centenas = Math.floor(
      numero / 100
    );

    const resto = numero % 100;

    const partes: string[] = [];

    if (centenas > 0) {

      const textosCentenas = [
        '',
        'CIENTO',
        'DOSCIENTOS',
        'TRESCIENTOS',
        'CUATROCIENTOS',
        'QUINIENTOS',
        'SEISCIENTOS',
        'SETECIENTOS',
        'OCHOCIENTOS',
        'NOVECIENTOS'
      ];

      partes.push(
        textosCentenas[centenas]
      );

    }

    if (resto > 0) {

      partes.push(
        this.convertirMenorACien(resto)
      );

    }

    return partes.join(' ');

  }

  private convertirMenorACien(
    numero: number
  ): string {

    const especiales: Record<number, string> = {
      0: 'CERO',
      1: 'UNO',
      2: 'DOS',
      3: 'TRES',
      4: 'CUATRO',
      5: 'CINCO',
      6: 'SEIS',
      7: 'SIETE',
      8: 'OCHO',
      9: 'NUEVE',
      10: 'DIEZ',
      11: 'ONCE',
      12: 'DOCE',
      13: 'TRECE',
      14: 'CATORCE',
      15: 'QUINCE',
      16: 'DIECISEIS',
      17: 'DIECISIETE',
      18: 'DIECIOCHO',
      19: 'DIECINUEVE',
      20: 'VEINTE',
      21: 'VEINTIUNO',
      22: 'VEINTIDOS',
      23: 'VEINTITRES',
      24: 'VEINTICUATRO',
      25: 'VEINTICINCO',
      26: 'VEINTISEIS',
      27: 'VEINTISIETE',
      28: 'VEINTIOCHO',
      29: 'VEINTINUEVE'
    };

    if (especiales[numero]) {
      return especiales[numero];
    }

    const decenas = [
      '',
      '',
      '',
      'TREINTA',
      'CUARENTA',
      'CINCUENTA',
      'SESENTA',
      'SETENTA',
      'OCHENTA',
      'NOVENTA'
    ];

    const decena = Math.floor(
      numero / 10
    );

    const unidad = numero % 10;

    if (unidad === 0) {
      return decenas[decena];
    }

    return (
      `${decenas[decena]} Y `
      + `${especiales[unidad]}`
    );

  }

}