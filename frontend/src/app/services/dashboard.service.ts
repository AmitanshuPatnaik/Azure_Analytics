import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  selectedModule = '';

  private selectedPageSubject = new BehaviorSubject<string>('home');
  selectedPage$ = this.selectedPageSubject.asObservable();

  get selectedPage(): string {
    return this.selectedPageSubject.value;
  }

  set selectedPage(page: string) {
    this.selectedPageSubject.next(page);
  }

  sidebarVisible = false;

  // Shared state for page-specific selections/coordination
  selectedProject: any = null;
  selectedRepoForDetails: any = null;
  hasReloadedDashboard = false;
}