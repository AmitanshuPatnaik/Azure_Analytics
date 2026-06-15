import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../services/dashboard.service';
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { PipelinesApiService } from '../../../../services/api/pipelines-api.service';

@Component({
  selector: 'app-pipelines',
  imports: [CommonModule],
  templateUrl: './pipelines.html',
  styleUrl: '../../home.css'
})
export class PipelinesComponent implements OnInit {

  projects: any[] = [];
  pipelines: any[] = [];
  selectedPipelineProject = '';
  isLoadingPipelines = false;
  pipelinesError: string | null = null;

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private pipelinesApi: PipelinesApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProjects();
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
        
        // Auto-select first project if none is selected
        if (this.projects.length > 0 && !this.selectedPipelineProject) {
          this.selectedPipelineProject = this.projects[0].name;
          this.loadPipelines(this.selectedPipelineProject);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load projects', err);
      }
    });
  }

  loadPipelines(projName: string) {
    this.isLoadingPipelines = true;
    this.pipelinesError = null;
    this.pipelinesApi.getPipelines(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.pipelines = res.pipelines || [];
        } else {
          this.pipelines = [];
          this.pipelinesError = res?.message || 'Failed to load pipelines from backend.';
        }
        this.isLoadingPipelines = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load pipelines for project ${projName}`, err);
        this.pipelines = [];
        this.pipelinesError = err.error?.detail || err.error?.message || err.message || `Failed to load pipelines for project ${projName}.`;
        this.isLoadingPipelines = false;
        this.cdr.detectChanges();
      }
    });
  }

  onPipelineProjectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const projName = select.value;
    this.selectedPipelineProject = projName;

    if (!projName) {
      this.pipelines = [];
      return;
    }
    this.loadPipelines(projName);
  }
}
