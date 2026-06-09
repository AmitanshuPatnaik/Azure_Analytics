import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {

  showLogout = false;

  showCloudOps = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    public dashboardService: DashboardService
  ) {}

  toggleLogout() {

    this.showLogout = !this.showLogout;

  }

  toggleCloudOps() {

    this.showCloudOps = !this.showCloudOps;

  }

  selectDevOps() {

    this.dashboardService.selectedModule = 'DevOps';

    this.dashboardService.selectedPage = 'home';

    this.dashboardService.sidebarVisible = true;

    this.showCloudOps = false;

    this.router.navigate(['/home']);

  }

  selectAzure() {

    this.dashboardService.selectedModule = 'Azure';

    this.dashboardService.selectedPage = 'azure';

    this.dashboardService.sidebarVisible = true;

    this.showCloudOps = false;

    this.router.navigate(['/home']);

  }

  logout() {

    this.authService.logout();

    this.router.navigate(['/login']);

  }

}