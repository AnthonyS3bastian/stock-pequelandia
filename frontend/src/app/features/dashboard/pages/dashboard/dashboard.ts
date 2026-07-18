import { Component } from '@angular/core';
import { SidebarComponent } from '../../components/sidebar/sidebar';
import { ToolbarComponent } from '../../components/toolbar/toolbar';
import { DashboardHomeComponent } from '../../components/dashboard-home/dashboard-home';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    SidebarComponent,
    ToolbarComponent,
    DashboardHomeComponent
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent {

}