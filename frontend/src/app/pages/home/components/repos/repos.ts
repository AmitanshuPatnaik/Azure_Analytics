import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../services/dashboard.service';
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { RepositoriesApiService } from '../../../../services/api/repositories-api.service';

@Component({
  selector: 'app-repos',
  imports: [CommonModule],
  templateUrl: './repos.html',
  styleUrl: '../../home.css'
})
export class ReposComponent implements OnInit {

  projects: any[] = [];
  repositories: any[] = [];
  selectedProjectFilter = '';
  reposError: string | null = null;

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private reposApi: RepositoriesApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadRepositories();
  }

  loadProjects() {
    this.projectsApi.getProjects().subscribe({
      next: (res: any) => {
        let projs = [];
        if (res && res.success && res.projects) {
          projs = res.projects;
        } else if (res && res.projects) {
          projs = res.projects;
        }
        this.projects = projs || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load projects', err);
      }
    });
  }

  loadRepositories() {
    this.reposError = null;
    this.reposApi.getAllRepositories().subscribe({
      next: (res: any) => {
        if (res && res.repositories && res.repositories.length > 0) {
          this.repositories = res.repositories;
        } else {
          this.repositories = [];
          this.reposError = 'No repositories found on backend.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch repositories from backend', err);
        this.repositories = [];
        this.reposError = err.error?.detail || err.error?.message || err.message || 'Failed to load repositories.';
        this.cdr.detectChanges();
      }
    });
  }

  onProjectFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedProjectFilter = select.value;
  }

  get filteredRepositories() {
    if (!this.selectedProjectFilter) {
      return this.repositories;
    }
    return this.repositories.filter(r => r.project === this.selectedProjectFilter);
  }
}
