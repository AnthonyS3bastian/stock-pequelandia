import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  RolUsuario
} from '../interfaces/usuario.interface';

import {
  AuthService
} from '../services/auth.service';

export const rolGuard: CanActivateFn = (
  route
) => {

  const authService =
    inject(AuthService);

  const router =
    inject(Router);

  if (!authService.estaAutenticado()) {

    authService.limpiarSesionLocal();

    return router.createUrlTree(
      ['/login']
    );

  }

  const rolesPermitidos =
    route.data['roles'] as
      RolUsuario[] | undefined;

  if (
    !rolesPermitidos ||
    rolesPermitidos.length === 0
  ) {

    return true;

  }

  const rolUsuario =
    authService.getRol();

  if (
    rolUsuario &&
    rolesPermitidos.includes(
      rolUsuario
    )
  ) {

    return true;

  }

  return router.createUrlTree(
    ['/dashboard'],
    {
      queryParams: {
        acceso: 'denegado'
      }
    }
  );

};