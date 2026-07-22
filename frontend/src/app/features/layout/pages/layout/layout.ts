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

import { filter } from 'rxjs';

import {
  takeUntilDestroyed
} from '@angular/core/rxjs-interop';

import {
  SidebarComponent
} from '../../components/sidebar/sidebar';

import {
  ToolbarComponent
} from '../../components/toolbar/toolbar';

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

  esMovil = false;

  menuAbierto = true;

  constructor() {

    this.breakpointObserver
      .observe('(max-width: 768px)')
      .pipe(
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(resultado => {

        this.esMovil = resultado.matches;

        this.menuAbierto = !this.esMovil;

      });

    this.router.events
      .pipe(
        filter(
          (evento): evento is NavigationEnd =>
            evento instanceof NavigationEnd
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {

        this.cerrarMenuMovil();

      });

  }

  alternarMenu(): void {

    this.menuAbierto = !this.menuAbierto;

  }

  cerrarMenuMovil(): void {

    if (this.esMovil) {

      this.menuAbierto = false;

    }

  }

}