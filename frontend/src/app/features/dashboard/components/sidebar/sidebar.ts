import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';

interface MenuItem {
  titulo: string;
  icono: string;
  ruta: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {

  principal: MenuItem[] = [
    {
      titulo: 'Dashboard',
      icono: 'dashboard',
      ruta: '/dashboard'
    }
  ];

  gestion: MenuItem[] = [
    {
      titulo: 'Categorías',
      icono: 'category',
      ruta: '/categorias'
    },
    {
      titulo: 'Productos',
      icono: 'inventory_2',
      ruta: '/productos'
    },
    {
      titulo: 'Clientes',
      icono: 'groups',
      ruta: '/clientes'
    },
    {
      titulo: 'Ventas',
      icono: 'shopping_cart',
      ruta: '/ventas'
    },
    {
      titulo: 'Usuarios',
      icono: 'person',
      ruta: '/usuarios'
    }
  ];

}