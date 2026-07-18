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
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard')
        .then(m => m.DashboardComponent)
  },

  {
    path: 'categorias',
    loadComponent: () =>
      import('./features/categorias/pages/categorias/categorias')
        .then(m => m.CategoriasComponent)
  },

  {
    path: '**',
    redirectTo: 'login'
  }
];