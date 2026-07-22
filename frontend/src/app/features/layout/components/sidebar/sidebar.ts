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
    },
    {
      titulo: 'Inventario',
      icono: 'inventory_2',
      ruta: '/inventario'
    }
  ];

  gestion: MenuItem[] = [
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
      titulo: 'Reportes',
      icono: 'bar_chart',
      ruta: '/reportes'
    },
    {
      titulo: 'Usuarios',
      icono: 'person',
      ruta: '/usuarios'
    }
  ];

}