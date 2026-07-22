import { Component } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import {
    ReporteDiarioComponent
} from '../../components/reporte-diario/reporte-diario';

@Component({
    selector: 'app-reportes',
    standalone: true,
    imports: [
        MatIconModule,
        MatTabsModule,
        ReporteDiarioComponent
    ],
    templateUrl: './reportes.html',
    styleUrl: './reportes.scss'
})
export class ReportesComponent {
}