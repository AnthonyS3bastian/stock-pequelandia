import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  ocultarPassword = signal(true);
  cargando = signal(false);

  loginForm = this.fb.nonNullable.group({

    nombre_usuario: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50)
      ]
    ],

    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100)
      ]
    ]

  });

  cambiarVisibilidad(): void {

    this.ocultarPassword.update(valor => !valor);

  }

  iniciarSesion(): void {

    if (this.loginForm.invalid) {

      this.loginForm.markAllAsTouched();

      return;

    }

    this.cargando.set(true);

    this.authService.login(this.loginForm.getRawValue()).subscribe({

      next: (response) => {

        console.log(response);

        this.cargando.set(false);

        this.router.navigate(['/dashboard']);

      },

      error: (error) => {

        this.cargando.set(false);

        console.error(error);

        alert(
          error.error?.mensaje ??
          'Usuario o contraseña incorrectos.'
        );

      }

    });

  }

  get usuario() {

    return this.loginForm.controls.nombre_usuario;

  }

  get password() {

    return this.loginForm.controls.password;

  }

}