import { Component } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import {
    ReporteDiarioComponent
} from '../../components/reporte-diario/reporte-diario';

import {
    ReporteSemanalComponent
} from '../../components/reporte-semanal/reporte-semanal';

@Component({
    selector: 'app-reportes',
    standalone: true,
    imports: [
        MatIconModule,
        MatTabsModule,
        ReporteDiarioComponent,
        ReporteSemanalComponent
    ],
    templateUrl: './reportes.html',
    styleUrl: './reportes.scss'
})
export class ReportesComponent {
}