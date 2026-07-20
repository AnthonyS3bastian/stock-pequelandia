import { Routes } from '@angular/router';

export const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login')
        .then(m => m.Login)
  },

  {
    path: '',
    loadComponent: () =>
      import('./features/layout/pages/layout/layout')
        .then(m => m.LayoutComponent),

    children: [

      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },

      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard/dashboard')
            .then(m => m.DashboardComponent)
      },

      {
        path: 'inventario',
        loadComponent: () =>
          import('./features/inventario/pages/inventario/inventario')
            .then(m => m.InventarioComponent)
      },

      {
        path: 'ventas',
        loadComponent: () =>
          import('./features/ventas/pages/ventas/ventas')
            .then(m => m.Ventas)
      }

    ]

  },

  {
    path: '**',
    redirectTo: 'login'
  }

];