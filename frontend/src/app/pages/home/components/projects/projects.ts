import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../services/dashboard.service';
import { ProjectsApiService } from '../../../../services/api/projects-api.service';

@Component({
  selector: 'app-projects',
  imports: [CommonModule],
  templateUrl: './projects.html',
  styleUrl: '../../home.css'
})
export class ProjectsComponent implements OnInit {

  projects: any[] = [];
  isLoadingProjects = false;
  projectsError: string | null = null;

  currentPage = 1;
  pageSize = 10;
  get Math() { return Math; }

  get paginatedProjects(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.projects.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.projects.length / this.pageSize);
  }

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.isLoadingProjects = true;
    this.projectsError = null;
    this.projectsApi.getProjects().subscribe({
      next: (res: any) => {
        let projs = [];
        if (res && res.success && res.projects) {
          projs = res.projects;
        } else if (res && res.projects) {
          projs = res.projects;
        }
        this.projects = projs || [];
        this.currentPage = 1;
        this.isLoadingProjects = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch projects from backend', err);
        this.projects = [];
        this.currentPage = 1;
        this.projectsError = err.error?.detail || err.error?.message || err.message || 'Failed to load projects from backend.';
        this.isLoadingProjects = false;
        this.cdr.detectChanges();
      }
    });
  }

  openProject(project: any) {
    this.dashboardService.selectedProject = project;
    this.dashboardService.selectedRepoForDetails = null;
    this.dashboardService.selectedPage = 'project-detail';
  }
}
