import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSidenavModule } from '@angular/material/sidenav';

import { Categoria } from '../../interfaces/categoria.interface';
import { Producto } from '../../interfaces/producto.interface';

import { CategoriaService } from '../../services/categoria';
import { ProductoService } from '../../services/producto';

import { DrawerProductoComponent } from '../../components/drawer-producto/drawer-producto';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSidenavModule,
    DrawerProductoComponent
  ],
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss'
})
export class InventarioComponent implements OnInit {

  private categoriaService = inject(CategoriaService);
  private productoService = inject(ProductoService);
  private cdr = inject(ChangeDetectorRef);

  categorias: Categoria[] = [];
  productos: Producto[] = [];

  cargando = false;

  textoBusqueda = '';

  categoriaSeleccionada = 0;

  drawerAbierto = false;

  ngOnInit(): void {

    this.obtenerCategorias();
    this.obtenerProductos();

  }

  obtenerCategorias(): void {

    this.categoriaService.listar().subscribe({

      next: (response) => {

        this.categorias = response.data;

      },

      error: (error) => {

        console.error(error);

      }

    });

  }

  obtenerProductos(): void {

    this.productoService.listar().subscribe({

      next: (response) => {

        this.productos = [...response.data];

        this.cdr.detectChanges();

      },

      error: (error) => {

        console.error(error);

      }

    });

  }

  buscarProducto(): void {

    console.log(this.textoBusqueda);

  }

  cambiarCategoria(): void {

    console.log(this.categoriaSeleccionada);

  }

  abrirDrawer(): void {

    this.drawerAbierto = true;

  }

  cerrarDrawer(): void {

    this.drawerAbierto = false;

    this.obtenerProductos();

  }

}