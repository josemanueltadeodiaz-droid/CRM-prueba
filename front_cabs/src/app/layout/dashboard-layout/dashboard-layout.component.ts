import { Component } from '@angular/core';
import { Sidebar } from '../sidebar/sidebar';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [Sidebar, RouterOutlet, HeaderComponent],
  templateUrl: './dashboard-layout.component.html',
})
export class DashboardLayoutComponent {}
