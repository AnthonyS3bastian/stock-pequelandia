import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

interface Venta {
  cliente: string;
  total: string;
  estado: string;
}

interface Stock {
  producto: string;
  cantidad: number;
}

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule
  ],
  templateUrl: './dashboard-home.html',
  styleUrl: './dashboard-home.scss'
})
export class DashboardHomeComponent {

  columnas: string[] = ['cliente', 'total', 'estado'];

  ventas: Venta[] = [
    {
      cliente: 'Juan Pérez',
      total: 'S/ 120.00',
      estado: 'Completada'
    },
    {
      cliente: 'María López',
      total: 'S/ 85.00',
      estado: 'Completada'
    },
    {
      cliente: 'Carlos Díaz',
      total: 'S/ 240.00',
      estado: 'Pendiente'
    }
  ];

  stockCritico: Stock[] = [
    {
      producto: 'Leche Gloria',
      cantidad: 2
    },
    {
      producto: 'Arroz Costeño',
      cantidad: 1
    },
    {
      producto: 'Azúcar',
      cantidad: 4
    },
    {
      producto: 'Aceite Primor',
      cantidad: 3
    }
  ];

}