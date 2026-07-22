import {
  Component,
  computed,
  inject
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterModule
} from '@angular/router';

import {
  MatListModule
} from '@angular/material/list';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatDividerModule
} from '@angular/material/divider';

import {
  AuthService
} from '../../../../core/services/auth.service';

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

  private readonly authService =
    inject(AuthService);

  readonly principal: MenuItem[] = [
    {
      titulo: 'Dashboard',
      icono: 'dashboard',
      ruta: '/dashboard'
    }
  ];

  private readonly gestionGeneral:
    MenuItem[] = [
      {
        titulo: 'Inventario',
        icono: 'inventory_2',
        ruta: '/inventario'
      },
      {
        titulo: 'Ventas',
        icono: 'point_of_sale',
        ruta: '/ventas'
      }
    ];

  private readonly gestionAdministrador:
    MenuItem[] = [
      {
        titulo: 'Reportes',
        icono: 'bar_chart',
        ruta: '/reportes'
      }
    ];

  readonly gestion = computed<MenuItem[]>(
    () => {

      const usuario =
        this.authService.usuarioActual();

      if (
        usuario?.rol_usuario ===
        'ADMINISTRADOR'
      ) {

        return [
          ...this.gestionGeneral,
          ...this.gestionAdministrador
        ];

      }

      return [
        ...this.gestionGeneral
      ];

    }
  );

}