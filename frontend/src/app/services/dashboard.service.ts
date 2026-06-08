import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  selectedModule = '';

  selectedPage = 'home';

  sidebarVisible = false;

}