import {
  Routes
} from '@angular/router';

import {
  authGuard
} from './core/guards/auth.guard';

import {
  rolGuard
} from './core/guards/rol.guard';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadComponent: () =>
      import(
        './features/auth/pages/login/login'
      )
        .then(
          modulo => modulo.Login
        )
  },

  {
    path: '',
    canActivate: [
      authGuard
    ],
    loadComponent: () =>
      import(
        './features/layout/pages/layout/layout'
      )
        .then(
          modulo => modulo.LayoutComponent
        ),

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import(
            './features/dashboard/pages/dashboard/dashboard'
          )
            .then(
              modulo =>
                modulo.DashboardComponent
            )
      },

      {
        path: 'inventario',
        loadComponent: () =>
          import(
            './features/inventario/pages/inventario/inventario'
          )
            .then(
              modulo =>
                modulo.InventarioComponent
            )
      },

      {
        path: 'categorias',
        canActivate: [
          rolGuard
        ],
        data: {
          roles: [
            'ADMINISTRADOR'
          ]
        },
        loadComponent: () =>
          import(
            './features/categorias/pages/categorias/categorias'
          )
            .then(
              modulo =>
                modulo.CategoriasComponent
            )
      },

      {
        path: 'ventas',
        loadComponent: () =>
          import(
            './features/ventas/pages/ventas/ventas'
          )
            .then(
              modulo => modulo.Ventas
            )
      },

      {
        path: 'reportes',
        canActivate: [
          rolGuard
        ],
        data: {
          roles: [
            'ADMINISTRADOR'
          ]
        },
        loadComponent: () =>
          import(
            './features/reportes/pages/reportes/reportes'
          )
            .then(
              modulo =>
                modulo.ReportesComponent
            )
      },

      {
        path: 'usuarios',
        canActivate: [
          rolGuard
        ],
        data: {
          roles: [
            'ADMINISTRADOR'
          ]
        },
        loadComponent: () =>
          import(
            './features/usuarios/pages/usuarios/usuarios'
          )
            .then(
              modulo =>
                modulo.UsuariosComponent
            )
      },

      {
        path: 'perfil',
        loadComponent: () =>
          import(
            './features/perfil/pages/perfil/perfil'
          )
            .then(
              modulo =>
                modulo.PerfilComponent
            )
      },

      {
        path: '**',
        redirectTo: 'dashboard'
      }

    ]

  },

  {
    path: '**',
    redirectTo: 'login'
  }

];
