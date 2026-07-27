export interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  descripcion_categoria: string | null;
  estado: boolean;
  productos_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CategoriaPayload {
  nombre_categoria: string;
  descripcion_categoria: string | null;
  estado: boolean;
}

export interface CategoriaResponse {
  mensaje: string;
  data: Categoria;
}

export interface CategoriasResponse {
  mensaje: string;
  data: Categoria[];
}
