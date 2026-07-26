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
  Usuario
} from '../../../../core/interfaces/usuario.interface';

import {
  CrearEmpleadoRequest
} from '../../interfaces/usuario-gestion.interface';

import {
  UsuarioService
} from '../../services/usuario.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss'
})
export class UsuariosComponent {

  private readonly fb =
    inject(FormBuilder);

  private readonly usuarioService =
    inject(UsuarioService);

  private readonly snackBar =
    inject(MatSnackBar);

  readonly usuarios =
    signal<Usuario[]>([]);

  readonly cargando =
    signal(true);

  readonly guardando =
    signal(false);

  readonly mostrarFormulario =
    signal(false);

  readonly procesandoId =
    signal<number | null>(null);

  readonly formulario =
    this.fb.nonNullable.group({
      dni_personal: [
        '',
        [
          Validators.required,
          Validators.pattern(/^\d{8}$/)
        ]
      ],
      nombre_personal: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],
      apellido_personal: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],
      tel_personal: [
        '',
        [
          Validators.pattern(/^\d{6,12}$/)
        ]
      ],
      nombre_usuario: [
        '',
        [
          Validators.required,
          Validators.minLength(3),
          Validators.maxLength(50),
          Validators.pattern(/^[a-zA-Z0-9_-]+$/)
        ]
      ]
    });

  constructor() {
    this.cargarUsuarios();
  }

  abrirFormulario(): void {

    this.formulario.reset();

    this.mostrarFormulario.set(true);

  }

  cerrarFormulario(): void {

    if (this.guardando()) {
      return;
    }

    this.formulario.reset();

    this.mostrarFormulario.set(false);

  }

  crearEmpleado(): void {

    if (this.formulario.invalid) {

      this.formulario.markAllAsTouched();

      return;

    }

    this.guardando.set(true);

    const valores =
      this.formulario.getRawValue();

    const datos: CrearEmpleadoRequest = {
      ...valores,
      dni_personal:
        valores.dni_personal.trim(),
      nombre_personal:
        valores.nombre_personal.trim(),
      apellido_personal:
        valores.apellido_personal.trim(),
      tel_personal:
        valores.tel_personal.trim() || null,
      nombre_usuario:
        valores.nombre_usuario.trim()
    };

    this.usuarioService
      .crear(datos)
      .subscribe({
        next: response => {

          this.guardando.set(false);

          this.mostrarFormulario.set(false);

          this.formulario.reset();

          this.mostrarMensaje(
            response.mensaje
          );

          this.cargarUsuarios();

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

  cambiarEstado(
    usuario: Usuario
  ): void {

    if (
      usuario.rol_usuario !==
      'EMPLEADO'
    ) {
      return;
    }

    const accion =
      usuario.estado_usuario
        ? 'desactivar'
        : 'activar';

    const confirmado =
      window.confirm(
        `¿Deseas ${accion} la cuenta de ${this.nombreCompleto(usuario)}?`
      );

    if (!confirmado) {
      return;
    }

    this.procesandoId.set(
      usuario.id_usuario
    );

    this.usuarioService
      .cambiarEstado(
        usuario.id_usuario
      )
      .subscribe({
        next: response => {

          this.procesandoId.set(null);

          this.mostrarMensaje(
            response.mensaje
          );

          this.reemplazarUsuario(
            response.usuario
          );

        },
        error: error => {

          this.procesandoId.set(null);

          this.mostrarMensaje(
            this.obtenerMensajeError(error),
            true
          );

        }
      });

  }

  restablecerPassword(
    usuario: Usuario
  ): void {

    if (
      usuario.rol_usuario !==
      'EMPLEADO'
    ) {
      return;
    }

    const confirmado =
      window.confirm(
        `La contraseña volverá a ser el DNI de ${this.nombreCompleto(usuario)}. ¿Continuar?`
      );

    if (!confirmado) {
      return;
    }

    this.procesandoId.set(
      usuario.id_usuario
    );

    this.usuarioService
      .restablecerPassword(
        usuario.id_usuario
      )
      .subscribe({
        next: response => {

          this.procesandoId.set(null);

          this.mostrarMensaje(
            response.mensaje
          );

        },
        error: error => {

          this.procesandoId.set(null);

          this.mostrarMensaje(
            this.obtenerMensajeError(error),
            true
          );

        }
      });

  }

  nombreCompleto(
    usuario: Usuario
  ): string {

    if (!usuario.personal) {
      return usuario.nombre_usuario;
    }

    return `${usuario.personal.nombre_personal} ${usuario.personal.apellido_personal}`;

  }

  private cargarUsuarios(): void {

    this.cargando.set(true);

    this.usuarioService
      .listar()
      .subscribe({
        next: response => {

          this.usuarios.set(
            response.usuarios
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

  private reemplazarUsuario(
    usuarioActualizado: Usuario
  ): void {

    this.usuarios.update(
      usuarios =>
        usuarios.map(usuario =>
          usuario.id_usuario ===
          usuarioActualizado.id_usuario
            ? usuarioActualizado
            : usuario
        )
    );

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
