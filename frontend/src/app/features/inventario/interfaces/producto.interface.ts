export interface CodigoBarraProducto {

  id_codigo_barra: number;

  codigo_barra: string;

  id_producto: number;

  estado: boolean;

  created_at?: string;

  updated_at?: string;

}

export interface LoteProductoInventario {

  id_lote_producto: number;

  id_producto: number;

  cantidad_inicial: number;

  cantidad_disponible: number;

  costo_unitario: number;

  fecha_ingreso: string;

  fecha_caducidad: string | null;

  estado: boolean;

  created_at?: string;

  updated_at?: string;

}

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

  stock_minimo_producto: number;

  estado: boolean;

  created_at?: string;

  updated_at?: string;

  categoria?: {

    id_categoria: number;

    nombre_categoria: string;

  };

  /*
   * Laravel normalmente serializa
   * la relacion codigosBarra como
   * codigos_barra.
   */
  codigos_barra?:
    CodigoBarraProducto[];

  /*
   * Compatibilidad adicional por si
   * alguna respuesta conserva camelCase.
   */
  codigosBarra?:
    CodigoBarraProducto[];

  lotes?:
    LoteProductoInventario[];

}