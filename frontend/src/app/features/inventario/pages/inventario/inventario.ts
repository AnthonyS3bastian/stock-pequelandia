import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatSidenavModule } from '@angular/material/sidenav';

import { Categoria } from '../../interfaces/categoria.interface';
import { CategoriaService } from '../../services/categoria';

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

  categorias: Categoria[] = [];

  cargando = false;

  textoBusqueda = '';

  categoriaSeleccionada = 0;

  drawerAbierto = false;

  ngOnInit(): void {

    this.obtenerCategorias();

  }

  obtenerCategorias(): void {

    this.cargando = true;

    this.categoriaService.listar().subscribe({

      next: (response) => {

        this.categorias = response.data;
        this.cargando = false;

      },

      error: (error) => {

        console.error(error);
        this.cargando = false;

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

  }

}