export interface DatosNegocio {
  nombreComercial: string;
  ruc: string;
  direccion: string;
  ubicacion: string;
  telefono: string;
  rutaLogo: string;
}

export const DATOS_NEGOCIO:
  DatosNegocio = {

  nombreComercial:
    'MULTISERVICIOS PEQUELANDIA A & A',

  /*
   * Este número fue proporcionado
   * temporalmente con 10 dígitos.
   *
   * Reemplazarlo cuando la dueña
   * confirme el RUC completo.
   */
  ruc:
    '1042849400',

  direccion:
    'AV. MANCO CAPAC 214',

  ubicacion:
    'TALAVERA - ANDAHUAYLAS - APURIMAC',

  telefono:
    '984784845',

  rutaLogo:
    '/logo/LogoPequelandia.png'

};