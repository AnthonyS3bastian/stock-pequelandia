import {
  Component,
  DestroyRef,
  inject
} from '@angular/core';

import {
  NavigationEnd,
  Router,
  RouterOutlet
} from '@angular/router';

import {
  BreakpointObserver
} from '@angular/cdk/layout';

import {
  MatSidenavModule
} from '@angular/material/sidenav';

import {
  filter,
  finalize
} from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  SidebarComponent
} from '../../components/sidebar/sidebar';

import {
  ToolbarComponent
} from '../../components/toolbar/toolbar';

import {
  AuthService
} from '../../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    MatSidenavModule,
    SidebarComponent,
    ToolbarComponent
  ],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class LayoutComponent {

  private readonly breakpointObserver =
    inject(BreakpointObserver);

  private readonly router =
    inject(Router);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly authService =
    inject(AuthService);

  /*
  |--------------------------------------------------------------------------
  | Configuracion de inactividad
  |--------------------------------------------------------------------------
  |
  | Para produccion debe quedar en 60 minutos.
  |
  */

  private readonly tiempoInactividad =
    60 * 60 * 1000;

  /*
  |--------------------------------------------------------------------------
  | Evita escribir demasiadas veces en localStorage
  |--------------------------------------------------------------------------
  */

  private readonly intervaloRegistroActividad =
    5 * 1000;

  private temporizadorInactividad:
    ReturnType<typeof setTimeout> | null =
      null;

  private ultimaActividadProcesada = 0;

  private cerrandoPorInactividad = false;

  /*
  |--------------------------------------------------------------------------
  | Actividad intencional
  |--------------------------------------------------------------------------
  |
  | No usamos mousemove porque algunos mouse y touchpads generan movimientos
  | pequeños incluso cuando el usuario no está utilizando el sistema.
  |
  */

  private readonly eventosActividad: Array<
    keyof DocumentEventMap
  > = [
    'pointerdown',
    'keydown',
    'touchstart',
    'wheel'
  ];

  private readonly manejarActividad =
    (): void => {

      if (
        this.cerrandoPorInactividad ||
        !this.authService.estaAutenticado()
      ) {
        return;
      }

      const ahora =
        Date.now();

      if (
        ahora -
        this.ultimaActividadProcesada <
        this.intervaloRegistroActividad
      ) {
        return;
      }

      this.ultimaActividadProcesada =
        ahora;

      this.authService
        .registrarActividad();

      this.programarCierreInactividad();

    };

  private readonly verificarVisibilidad =
    (): void => {

      if (
        document.visibilityState ===
        'visible'
      ) {
        this.verificarInactividad();
      }

    };

  private readonly manejarCambioStorage =
    (
      evento: StorageEvent
    ): void => {

      if (
        evento.key ===
        'ultima_actividad'
      ) {
        this.programarCierreInactividad();
      }

      if (
        evento.key === 'token' &&
        evento.newValue === null
      ) {

        this.authService
          .limpiarSesionLocal();

        this.router.navigate(
          ['/login'],
          {
            replaceUrl: true
          }
        );

      }

    };

  esMovil = false;

  menuAbierto = true;

  constructor() {

    this.configurarResponsive();

    this.configurarNavegacion();

    this.configurarInactividad();

    this.destroyRef.onDestroy(
      () => {

        this.eliminarEventosActividad();

        this.limpiarTemporizador();

      }
    );

  }

  alternarMenu(): void {

    this.menuAbierto =
      !this.menuAbierto;

  }

  cerrarMenuMovil(): void {

    if (this.esMovil) {

      this.menuAbierto = false;

    }

  }

  private configurarResponsive():
    void {

    this.breakpointObserver
      .observe(
        '(max-width: 768px)'
      )
      .pipe(
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(resultado => {

        this.esMovil =
          resultado.matches;

        this.menuAbierto =
          !this.esMovil;

      });

  }

  private configurarNavegacion():
    void {

    this.router.events
      .pipe(
        filter(
          (
            evento
          ): evento is NavigationEnd =>
            evento instanceof
              NavigationEnd
        ),
        takeUntilDestroyed(
          this.destroyRef
        )
      )
      .subscribe(() => {

        this.cerrarMenuMovil();

      });

  }

  private configurarInactividad():
    void {

    if (
      !this.authService
        .estaAutenticado()
    ) {
      return;
    }

    const ultimaActividad =
      this.authService
        .getUltimaActividad();

    if (!ultimaActividad) {

      this.authService
        .registrarActividad();

    }

    this.agregarEventosActividad();

    this.verificarInactividad();

  }

  private agregarEventosActividad():
    void {

    for (
      const evento of
      this.eventosActividad
    ) {

      document.addEventListener(
        evento,
        this.manejarActividad,
        {
          passive: true
        }
      );

    }

    document.addEventListener(
      'visibilitychange',
      this.verificarVisibilidad
    );

    window.addEventListener(
      'storage',
      this.manejarCambioStorage
    );

  }

  private eliminarEventosActividad():
    void {

    for (
      const evento of
      this.eventosActividad
    ) {

      document.removeEventListener(
        evento,
        this.manejarActividad
      );

    }

    document.removeEventListener(
      'visibilitychange',
      this.verificarVisibilidad
    );

    window.removeEventListener(
      'storage',
      this.manejarCambioStorage
    );

  }

  private verificarInactividad():
    void {

    if (
      this.cerrandoPorInactividad ||
      !this.authService
        .estaAutenticado()
    ) {
      return;
    }

    const ultimaActividad =
      this.authService
        .getUltimaActividad();

    if (!ultimaActividad) {

      this.authService
        .registrarActividad();

      this.programarCierreInactividad();

      return;

    }

    const tiempoTranscurrido =
      Date.now() -
      ultimaActividad;

    if (
      tiempoTranscurrido >=
      this.tiempoInactividad
    ) {

      this.cerrarSesionPorInactividad();

      return;

    }

    this.programarCierreInactividad();

  }

  private programarCierreInactividad():
    void {

    this.limpiarTemporizador();

    const ultimaActividad =
      this.authService
        .getUltimaActividad();

    if (!ultimaActividad) {
      return;
    }

    const tiempoTranscurrido =
      Date.now() -
      ultimaActividad;

    const tiempoRestante =
      Math.max(
        this.tiempoInactividad -
        tiempoTranscurrido,
        0
      );

    this.temporizadorInactividad =
      setTimeout(
        () => {

          this.verificarInactividad();

        },
        tiempoRestante
      );

  }

  private limpiarTemporizador():
    void {

    if (
      this.temporizadorInactividad
    ) {

      clearTimeout(
        this.temporizadorInactividad
      );

      this.temporizadorInactividad =
        null;

    }

  }

  private cerrarSesionPorInactividad():
    void {

    if (
      this.cerrandoPorInactividad
    ) {
      return;
    }

    this.cerrandoPorInactividad =
      true;

    this.limpiarTemporizador();

    this.authService
      .logout()
      .pipe(
        finalize(() => {

          this.router.navigate(
            ['/login'],
            {
              replaceUrl: true,
              queryParams: {
                motivo:
                  'inactividad'
              }
            }
          );

        })
      )
      .subscribe();

  }

}