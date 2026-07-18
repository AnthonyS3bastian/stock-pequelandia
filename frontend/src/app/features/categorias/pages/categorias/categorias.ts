import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Categoria } from '../../interfaces/categoria.interface';
import { CategoriaService } from '../../services/categoria';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './categorias.html',
  styleUrl: './categorias.scss'
})
export class CategoriasComponent implements OnInit {

  private categoriaService = inject(CategoriaService);

  categorias: Categoria[] = [];
  cargando = true;

  ngOnInit(): void {
    this.listarCategorias();
  }

  listarCategorias(): void {

    this.cargando = true;

    this.categoriaService.listar().subscribe({
      next: (response) => {
        this.categorias = response.data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.cargando = false;
      }
    });

  }

}