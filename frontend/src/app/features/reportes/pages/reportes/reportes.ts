import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';

interface ProductoMasVendido {
  nombre: string;
  cantidad: number;
}

interface VentaPorUsuario {
  usuario: string;
  cantidadVentas: number;
  totalVendido: number;
}

interface UltimaVenta {
  hora: string;
  numeroVenta: string;
  productos: string;
  usuario: string;
  total: number;
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule
  ],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss'
})
export class ReportesComponent {

  fechaSeleccionada = '2026-07-21';

  totalVendido = 245.50;
  costoEstimado = 147.30;
  gananciaEstimada = 98.20;
  ventasRealizadas = 12;
  productosVendidos = 28;
  ticketPromedio = 20.46;

  metaDiaria = 100;

  productoMasVendido: ProductoMasVendido = {
    nombre: 'Pilas AA',
    cantidad: 8
  };

  ventasPorUsuario: VentaPorUsuario[] = [
    {
      usuario: 'Administrador',
      cantidadVentas: 7,
      totalVendido: 145.50
    },
    {
      usuario: 'Maria',
      cantidadVentas: 5,
      totalVendido: 100
    }
  ];

  ultimasVentas: UltimaVenta[] = [
    {
      hora: '10:42 a. m.',
      numeroVenta: 'Venta N.° 25',
      productos: 'Cuaderno x2, lapicero x3',
      usuario: 'Administrador',
      total: 18.50
    },
    {
      hora: '10:15 a. m.',
      numeroVenta: 'Venta N.° 24',
      productos: 'Peluche oso',
      usuario: 'Maria',
      total: 45
    },
    {
      hora: '09:58 a. m.',
      numeroVenta: 'Venta N.° 23',
      productos: 'Pilas AA x4',
      usuario: 'Administrador',
      total: 12
    }
  ];

  columnasVentas: string[] = [
    'hora',
    'venta',
    'productos',
    'usuario',
    'total'
  ];

  get porcentajeMeta(): number {
    if (this.metaDiaria <= 0) {
      return 0;
    }

    return Math.round(
      (this.totalVendido / this.metaDiaria) * 100
    );
  }

  get metaCumplida(): boolean {
    return this.totalVendido >= this.metaDiaria;
  }

  cambiarFecha(): void {
    console.log(
      'Fecha seleccionada:',
      this.fechaSeleccionada
    );
  }

  verVenta(numeroVenta: string): void {
    console.log(
      'Venta seleccionada:',
      numeroVenta
    );
  }
}