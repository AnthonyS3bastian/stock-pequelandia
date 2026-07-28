export type TipoComprobante =
  | 'VENTA RAPIDA'
  | 'BOLETA'
  | 'FACTURA';

export interface DetalleVentaRequest {
  id_producto: number;
  cantidad: number;
}

export interface RegistrarVentaRequest {
  tipo_comprobante: TipoComprobante;
  numero_documento: string | null;
  detalles: DetalleVentaRequest[];
}

export interface PersonalVenta {
  id_personal?: number;
  dni_personal?: string;
  nombre_personal?: string;
  apellido_personal?: string;
  tel_personal?: string;
}

export interface UsuarioVenta {
  id_usuario?: number;
  nombre_usuario?: string;
  rol_usuario?: string;
  personal?: PersonalVenta | null;
}

export interface ClienteVenta {
  id_cliente?: number;
  codigo_cliente?: string;
  tipo_cliente?: string;

  nombre_cliente?: string;
  nombres_cliente?: string;
  apellidos_cliente?: string;
  apellido_cliente?: string;

  razon_social_cliente?: string;
  nombre_razon_social?: string;

  direccion_cliente?: string;
  telefono_cliente?: string;
  correo_cliente?: string;

  [clave: string]: unknown;
}

export interface ProductoDetalleVenta {
  id_producto?: number;
  codigo_producto?: string;
  nombre_producto?: string;
  precio_producto?: number | string;
  stock_producto?: number;
}

export interface DetalleVentaResponse {
  id_detalle_venta?: number;
  precio_publico_venta?: number | string;
  costo_detalle_venta?: number | string;
  cantidad_detalle_venta?: number;
  id_producto?: number;
  id_venta?: number;
  producto?: ProductoDetalleVenta | null;
}

export interface SerieComprobanteVenta {
  id_serie_comprobante?: number;
  tipo_documento_serie?: TipoComprobante | string;
  serie_documento?: string;
  numero_correlativo?: number;
}

export interface VentaRegistrada {
  id_venta: number;
  fecha_venta: string;
  fecha_anulacion?: string | null;
  numero_comprobante: string;
  total_venta: number | string;
  estado_venta?: string;

  id_usuario?: number;
  id_usuario_anulacion?: number | null;
  id_serie_comprobante?: number;
  id_cliente?: number;

  usuario?: UsuarioVenta | null;
  usuario_anulacion?: UsuarioVenta | null;
  cliente?: ClienteVenta | null;
  serie_comprobante?: SerieComprobanteVenta | null;
  detalle_ventas?: DetalleVentaResponse[];
}

export interface RegistrarVentaResponse {
  ok: boolean;
  mensaje: string;
  venta: VentaRegistrada;
}

export interface BuscarVentaResponse {
  ok: boolean;
  mensaje: string;
  venta: VentaRegistrada;
  puede_anular: boolean;
  motivo_bloqueo: string | null;
}

export interface AnularVentaResponse {
  ok: boolean;
  mensaje: string;
  venta: VentaRegistrada;
}

export interface DatosDni {
  success: boolean;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  codVerifica?: number;
  codVerificaLetra?: string;
}

export interface DatosRuc {
  ruc: string;
  razonSocial: string;
  nombreComercial?: string | null;
  estado: string;
  condicion: string;
  direccion: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
}

export interface ConsultaDniResponse {
  mensaje: string;
  datos: DatosDni;
}

export interface ConsultaRucResponse {
  mensaje: string;
  datos: DatosRuc;
}