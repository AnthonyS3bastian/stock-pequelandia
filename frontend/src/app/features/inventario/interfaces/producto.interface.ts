export interface Producto {

  id_producto?: number;

  codigo_producto: string;

  nombre_producto: string;

  descripcion_producto: string | null;

  id_categoria: number;

  precio_producto: number;

  costo_producto: number;

  fecha_caducidad: string | null;

  stock_producto: number;

  estado: boolean;

  categoria?: {

    id_categoria: number;

    nombre_categoria: string;

  };

}