import {
  CommonModule
} from '@angular/common';

import {
  Component,
  inject,
  signal
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatSnackBar,
  MatSnackBarModule
} from '@angular/material/snack-bar';

import {
  AuthService
} from '../../../../core/services/auth.service';

import {
  CambiarPasswordRequest,
  Usuario
} from '../../../../core/interfaces/usuario.interface';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly authService =
    inject(AuthService);

  private readonly snackBar =
    inject(MatSnackBar);

  readonly perfil =
    signal<Usuario | null>(
      this.authService.getUsuario()
    );

  readonly cargando =
    signal(true);

  readonly guardando =
    signal(false);

  readonly mostrarActual =
    signal(false);

  readonly mostrarNueva =
    signal(false);

  readonly mostrarConfirmacion =
    signal(false);

  readonly formulario =
    this.fb.nonNullable.group({
      password_actual: [
        '',
        [
          Validators.required
        ]
      ],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.maxLength(100)
        ]
      ],
      password_confirmation: [
        '',
        [
          Validators.required
        ]
      ]
    });

  constructor() {
    this.cargarPerfil();
  }


  alternarPasswordActual(): void {

    this.mostrarActual.update(
      valor => !valor
    );

  }

  alternarPasswordNueva(): void {

    this.mostrarNueva.update(
      valor => !valor
    );

  }

  alternarConfirmacion(): void {

    this.mostrarConfirmacion.update(
      valor => !valor
    );

  }

  cambiarPassword(): void {

    if (this.formulario.invalid) {

      this.formulario.markAllAsTouched();

      return;

    }

    const valores =
      this.formulario.getRawValue();

    if (
      valores.password !==
      valores.password_confirmation
    ) {

      this.formulario.controls
        .password_confirmation
        .setErrors({
          noCoincide: true
        });

      this.formulario.controls
        .password_confirmation
        .markAsTouched();

      return;

    }

    const datos:
      CambiarPasswordRequest = valores;

    this.guardando.set(true);

    this.authService
      .cambiarPassword(datos)
      .subscribe({
        next: response => {

          this.guardando.set(false);

          this.formulario.reset();

          this.mostrarMensaje(
            response.mensaje
          );

        },
        error: error => {

          this.guardando.set(false);

          this.mostrarMensaje(
            this.obtenerMensajeError(error),
            true
          );

        }
      });

  }

  nombreCompleto(): string {

    const usuario =
      this.perfil();

    if (!usuario?.personal) {
      return usuario?.nombre_usuario ?? 'Usuario';
    }

    return `${usuario.personal.nombre_personal} ${usuario.personal.apellido_personal}`;

  }

  rolFormateado(): string {

    return this.perfil()?.rol_usuario ===
      'ADMINISTRADOR'
        ? 'Administrador'
        : 'Empleado';

  }

  iniciales(): string {

    const partes =
      this.nombreCompleto()
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (partes.length >= 2) {
      return `${partes[0][0]}${partes[1][0]}`
        .toUpperCase();
    }

    return this.nombreCompleto()
      .substring(0, 2)
      .toUpperCase();

  }

  private cargarPerfil(): void {

    this.cargando.set(true);

    this.authService
      .obtenerPerfil()
      .subscribe({
        next: response => {

          this.perfil.set(
            response.perfil
          );

          this.cargando.set(false);

        },
        error: error => {

          this.cargando.set(false);

          this.mostrarMensaje(
            this.obtenerMensajeError(error),
            true
          );

        }
      });

  }

  private mostrarMensaje(
    mensaje: string,
    esError = false
  ): void {

    this.snackBar.open(
      mensaje,
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'top',
        panelClass: esError
          ? ['snackbar-error']
          : ['snackbar-exito']
      }
    );

  }

  private obtenerMensajeError(
    error: HttpErrorResponse
  ): string {

    const errores =
      error.error?.errors as
        Record<string, string[]> |
        undefined;

    if (errores) {

      const primerError =
        Object.values(errores)[0]?.[0];

      if (primerError) {
        return primerError;
      }

    }

    return (
      error.error?.mensaje ??
      error.error?.message ??
      'No se pudo completar la operacion.'
    );

  }

}
