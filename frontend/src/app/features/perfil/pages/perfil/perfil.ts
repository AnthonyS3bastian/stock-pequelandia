import {
  Component,
  OnInit,
  inject,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  MatCardModule
} from '@angular/material/card';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatProgressSpinnerModule
} from '@angular/material/progress-spinner';

import {
  Perfil
} from '../../interfaces/perfil.interface';

import {
  PerfilService
} from '../../services/perfil.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent
  implements OnInit {

  private readonly perfilService =
    inject(PerfilService);

  readonly perfil =
    signal<Perfil | null>(null);

  readonly cargando =
    signal(true);

  readonly error =
    signal('');

  ngOnInit(): void {

    this.cargarPerfil();

  }

  cargarPerfil(): void {

    this.cargando.set(true);

    this.error.set('');

    this.perfilService
      .obtenerPerfil()
      .subscribe({
        next: response => {

          this.perfil.set(
            response.perfil
          );

          this.cargando.set(false);

        },
        error: () => {

          this.error.set(
            'No se pudo cargar la informacion del perfil.'
          );

          this.cargando.set(false);

        }
      });

  }

  obtenerNombreCompleto(): string {

    const perfilActual =
      this.perfil();

    if (!perfilActual?.personal) {
      return perfilActual
        ?.nombre_usuario ?? '';
    }

    return [
      perfilActual
        .personal
        .nombre_personal,
      perfilActual
        .personal
        .apellido_personal
    ]
      .filter(Boolean)
      .join(' ');

  }

  obtenerIniciales(): string {

    const nombreCompleto =
      this.obtenerNombreCompleto()
        .trim();

    if (!nombreCompleto) {
      return 'US';
    }

    const partes =
      nombreCompleto
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length >= 2) {
      return (
        partes[0][0] +
        partes[1][0]
      ).toUpperCase();
    }

    return nombreCompleto
      .substring(0, 2)
      .toUpperCase();

  }

  formatearRol(
    rol: string
  ): string {

    return rol
      .toLowerCase()
      .replace(
        /(^\w|\s\w)/g,
        letra => letra.toUpperCase()
      );

  }

}