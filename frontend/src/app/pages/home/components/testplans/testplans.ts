import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../../services/dashboard.service';
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { TestPlansApiService } from '../../../../services/api/testplans-api.service';

@Component({
  selector: 'app-testplans',
  imports: [CommonModule, FormsModule],
  templateUrl: './testplans.html',
  styleUrl: '../../home.css'
})
export class TestplansComponent implements OnInit {

  projects: any[] = [];
  testPlans: any[] = [];
  selectedTestPlanProject = '';
  isLoadingTestPlans = false;
  testPlansError: string | null = null;
  testPlanSearch = '';

  get filteredTestPlans(): any[] {
    if (!this.testPlanSearch.trim()) return this.testPlans;
    const q = this.testPlanSearch.trim().toLowerCase();
    return this.testPlans.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.owner || '').toLowerCase().includes(q) ||
      (p.state || '').toLowerCase().includes(q)
    );
  }

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private testPlansApi: TestPlansApiService,
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load projects', err);
      }
    });
  }

  loadTestPlans(projName: string) {
    this.isLoadingTestPlans = true;
    this.testPlansError = null;
    this.testPlansApi.getTestPlans(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.testPlans = res.test_plans || [];
        } else {
          this.testPlans = [];
          this.testPlansError = res?.message || 'Failed to load test plans from backend.';
        }
        this.isLoadingTestPlans = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load test plans for project ${projName}`, err);
        this.testPlans = [];
        this.testPlansError = err.error?.detail || err.error?.message || err.message || `Failed to load test plans for project ${projName}.`;
        this.isLoadingTestPlans = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTestPlanProjectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const projName = select.value;
    this.selectedTestPlanProject = projName;

    if (!projName) {
      this.testPlans = [];
      return;
    }
    this.loadTestPlans(projName);
  }
}
