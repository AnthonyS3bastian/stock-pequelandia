import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (
  request,
  next
) => {

  const router = inject(Router);

  const token = localStorage.getItem('token');

  const esPeticionApi =
    request.url.startsWith(environment.apiUrl);

  const esLogin =
    request.url === `${environment.apiUrl}/login`;

  let solicitud = request;

  if (
    token
    && esPeticionApi
    && !esLogin
  ) {

    solicitud = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

  }

  return next(solicitud).pipe(

    catchError((error: HttpErrorResponse) => {

      if (
        error.status === 401
        && esPeticionApi
        && !esLogin
      ) {

        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('ultima_actividad');

        router.navigate(['/login']);

      }

      return throwError(() => error);

    })

  );

};