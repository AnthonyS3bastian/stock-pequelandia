import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Producto } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto';
import { Categoria } from '../../interfaces/categoria.interface';

@Component({
  selector: 'app-drawer-producto',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './drawer-producto.html',
  styleUrl: './drawer-producto.scss'
})
export class DrawerProductoComponent {

  @Input() categorias: Categoria[] = [];

  @Output() cerrar = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);

  formulario: FormGroup = this.fb.group({

    codigo_producto: ['', Validators.required],

    nombre_producto: ['', Validators.required],

    descripcion_producto: [''],

    id_categoria: [null, Validators.required],

    costo_producto: [0, Validators.required],

    precio_producto: [0, Validators.required],

    stock_producto: [0, Validators.required],

    fecha_caducidad_producto: [null],

    estado: [true]

  });

  cerrarDrawer(): void {

    this.cerrar.emit();

  }

  generarCodigo(): void {

    const codigo = Math.floor(
      100000000000 + Math.random() * 900000000000
    ).toString();

    this.formulario.patchValue({

      codigo_producto: codigo

    });

  }

  guardar(): void {

    if (this.formulario.invalid) {

      this.formulario.markAllAsTouched();

      alert('Complete todos los campos.');

      return;

    }

    const producto: Producto = {

      codigo_producto: this.formulario.value.codigo_producto,

      nombre_producto: this.formulario.value.nombre_producto,

      descripcion_producto: this.formulario.value.descripcion_producto,

      id_categoria: this.formulario.value.id_categoria,

      costo_producto: this.formulario.value.costo_producto,

      precio_producto: this.formulario.value.precio_producto,

      stock_producto: this.formulario.value.stock_producto,

      fecha_caducidad: this.formulario.value.fecha_caducidad_producto
        ? this.formulario.value.fecha_caducidad_producto
            .toISOString()
            .split('T')[0]
        : null,

      estado: this.formulario.value.estado

    };

    this.productoService.registrar(producto).subscribe({

      next: (response) => {

        alert(response.mensaje);

        this.formulario.reset({

          codigo_producto: '',

          nombre_producto: '',

          descripcion_producto: '',

          id_categoria: null,

          costo_producto: 0,

          precio_producto: 0,

          stock_producto: 0,

          fecha_caducidad_producto: null,

          estado: true

        });

        this.cerrarDrawer();

      },

      error: (error) => {

        console.error(error);

        alert('Error al registrar el producto.');

      }

    });

  }

}