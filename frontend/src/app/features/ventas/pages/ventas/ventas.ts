import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

@Component({
    selector: 'app-ventas',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatTableModule
    ],
    templateUrl: './ventas.html',
    styleUrl: './ventas.scss'
})
export class Ventas {

    displayedColumns: string[] = [
        'producto',
        'cantidad',
        'precio',
        'subtotal',
        'acciones'
    ];

    ventas: any[] = [];

    codigoBarras: string = '';

    agregarProducto(): void {

        console.log('Código leído:', this.codigoBarras);

    }

}