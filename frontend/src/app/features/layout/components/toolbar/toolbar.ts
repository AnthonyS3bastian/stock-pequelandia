import {
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  inject,
  signal
} from '@angular/core';

import {
  NavigationEnd,
  Router
} from '@angular/router';

import {
  filter,
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  MatToolbarModule
} from '@angular/material/toolbar';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatMenuModule
} from '@angular/material/menu';

import {
  AuthService
} from '../../../../core/services/auth.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './toolbar.html',
  styleUrl: './toolbar.scss'
})
export class ToolbarComponent {

  @Output()
  menuSolicitado =
    new EventEmitter<void>();

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly authService =
    inject(AuthService);

  tituloPagina =
    signal('Dashboard');

  fechaActual =
    signal('');

  horaActual =
    signal('');

  cerrandoSesion =
    signal(false);

  readonly usuario =
    this.authService.usuarioActual;

  readonly nombreUsuario =
    signal(
      this.usuario()
        ?.nombre_usuario ??
      'Usuario'
    );

  readonly rolUsuario =
    signal(
      this.formatearRol(
        this.usuario()?.rol_usuario
      )
    );

  readonly iniciales =
    signal(
      this.obtenerIniciales(
        this.nombreUsuario()
      )
    );

  constructor() {

    this.actualizarTitulo(
      this.router.url
    );

    this.router.events
      .pipe(
        filter(
          (evento): evento is
            NavigationEnd =>
            evento instanceof
              NavigationEnd
        ),
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(evento => {

        this.actualizarTitulo(
          evento.urlAfterRedirects
        );

      });

    this.actualizarFechaHora();

    const intervaloHora =
      window.setInterval(
        () => {

          this.actualizarFechaHora();

        },
        1000
      );

    this.destroyRef.onDestroy(
      () => {

        window.clearInterval(
          intervaloHora
        );

      }
    );

  }

  solicitarMenu(): void {

    this.menuSolicitado.emit();

  }

  irMiPerfil(): void {

    this.router.navigate(
      ['/perfil']
    );

  }

  cerrarSesion(): void {

    if (this.cerrandoSesion()) {

      return;

    }

    this.cerrandoSesion.set(true);

    this.authService
      .logout()
      .pipe(
        finalize(() => {

          this.cerrandoSesion.set(
            false
          );

        })
      )
      .subscribe(() => {

        this.router.navigate(
          ['/login'],
          {
            replaceUrl: true
          }
        );

      });

  }

  private actualizarTitulo(
    url: string
  ): void {

    const ruta = url
      .split('?')[0]
      .split('#')[0];

    if (
      ruta.startsWith(
        '/inventario'
      )
    ) {

      this.tituloPagina.set(
        'Inventario'
      );

      return;

    }

    if (
      ruta.startsWith(
        '/categorias'
      )
    ) {

      this.tituloPagina.set(
        'Categorias'
      );

      return;

    }

    if (
      ruta.startsWith(
        '/ventas'
      )
    ) {

      this.tituloPagina.set(
        'Ventas'
      );

      return;

    }

    if (
      ruta.startsWith(
        '/reportes'
      )
    ) {

      this.tituloPagina.set(
        'Reportes'
      );

      return;

    }

    if (
      ruta.startsWith(
        '/usuarios'
      )
    ) {

      this.tituloPagina.set(
        'Usuarios'
      );

      return;

    }

    if (
      ruta.startsWith(
        '/perfil'
      )
    ) {

      this.tituloPagina.set(
        'Mi perfil'
      );

      return;

    }

    this.tituloPagina.set(
      'Dashboard'
    );

  }

  private actualizarFechaHora():
    void {

    const ahora =
      new Date();

    const fechaFormateada =
      new Intl.DateTimeFormat(
        'es-PE',
        {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone:
            'America/Lima'
        }
      )
        .format(ahora)
        .replace(/\./g, '');

    this.fechaActual.set(
      fechaFormateada
        .charAt(0)
        .toUpperCase() +
      fechaFormateada.slice(1)
    );

    const horaFormateada =
      new Intl.DateTimeFormat(
        'es-PE',
        {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone:
            'America/Lima'
        }
      )
        .format(ahora);

    this.horaActual.set(
      horaFormateada
    );

  }

  private formatearRol(
    rol: string | undefined
  ): string {

    if (!rol) {

      return 'Sin rol';

    }

    return rol
      .toLowerCase()
      .replace(
        /(^\w|\s\w)/g,
        letra =>
          letra.toUpperCase()
      );

  }

  private obtenerIniciales(
    nombreUsuario: string
  ): string {

    const partes =
      nombreUsuario
        .trim()
        .split(/[\s._-]+/)
        .filter(Boolean);

    if (partes.length >= 2) {

      return (
        partes[0][0] +
        partes[1][0]
      ).toUpperCase();

    }

    return nombreUsuario
      .substring(0, 2)
      .toUpperCase();

  }

}
