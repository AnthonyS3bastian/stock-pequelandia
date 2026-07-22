import { Component } from '@angular/core';

import { MatTabsModule } from '@angular/material/tabs';

import {
    ReporteDiarioComponent
} from '../../components/reporte-diario/reporte-diario';

import {
    ReporteMensualComponent
} from '../../components/reporte-mensual/reporte-mensual';

import {
    ReporteSemanalComponent
} from '../../components/reporte-semanal/reporte-semanal';

@Component({
    selector: 'app-reportes',
    standalone: true,
    imports: [
        MatTabsModule,
        ReporteDiarioComponent,
        ReporteSemanalComponent,
        ReporteMensualComponent
    ],
    templateUrl: './reportes.html',
    styleUrl: './reportes.scss'
})
export class ReportesComponent {
}