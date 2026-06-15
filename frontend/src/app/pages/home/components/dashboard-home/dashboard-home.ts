import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

// API Services imports
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { RepositoriesApiService } from '../../../../services/api/repositories-api.service';
import { PipelinesApiService } from '../../../../services/api/pipelines-api.service';
import { AzureApiService } from '../../../../services/api/azure-api.service';
import { StatusApiService } from '../../../../services/api/status-api.service';

@Component({
  selector: 'app-dashboard-home',
  imports: [CommonModule],
  templateUrl: './dashboard-home.html',
  styleUrl: '../../home.css'
})
export class DashboardHomeComponent implements OnInit {

  // Real data arrays
  projects: any[] = [];
  repositories: any[] = [];
  azureProjects: string[] = [];
  servicesStatus: any[] = [];
  projectDistribution: any[] = [];

  // Loader / States
  isLoadingProjects = false;
  isLoadingRepos = false;
  isLoadingYearlyCost = false;
  isLoadingCostTrend = false;
  activePipelinesCount = 0;
  yearlyCost = 0;

  // Selections
  selectedHomeAzureProject = '';
  selectedHomeSubscriptionId = '';
  selectedTrendMonth = '';
  monthlyCostTotal = 0;

  // Chart Properties
  pieChartStyle = '';
  polylinePoints = '';
  circlePoints: any[] = [];
  yAxisLabels: string[] = [];
  trendData: any[] = [];
  trendMonths: string[] = [];

  // Project distribution popup
  showProjectDistributionDetails = false;

  // Error States
  projectsError: string | null = null;
  reposError: string | null = null;
  activePipelinesError: string | null = null;
  yearlyCostError: string | null = null;
  trendDataError: string | null = null;
  servicesStatusError: string | null = null;

  constructor(
    private projectsApi: ProjectsApiService,
    private reposApi: RepositoriesApiService,
    private pipelinesApi: PipelinesApiService,
    private azureApi: AzureApiService,
    private statusApi: StatusApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadRepositories();
    this.loadActivePipelinesCount();
    this.loadServicesStatus();
    this.loadAzureProjects();
  }

  loadAzureProjects() {
    this.azureApi.getAzureProjects().subscribe({
      next: (res: any) => {
        if (res && res.projects) {
          this.azureProjects = res.projects;
          if (this.azureProjects.length > 0) {
            // Auto-select first Azure project if none is selected
            if (!this.selectedHomeAzureProject) {
              this.selectedHomeAzureProject = this.azureProjects[0];
              this.loadTrendData();
              this.loadHomeSubscriptions(this.selectedHomeAzureProject);
            }
          }
        }
      },
      error: (err) => {
        console.warn('Failed to load Azure projects', err);
      }
    });
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
        this.isLoadingProjects = false;
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch projects from backend', err);
        this.projects = [];
        this.projectsError = err.error?.detail || err.error?.message || err.message || 'Failed to load projects from backend.';
        this.isLoadingProjects = false;
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      }
    });
  }

  loadRepositories() {
    this.isLoadingRepos = true;
    this.reposError = null;
    this.reposApi.getAllRepositories().subscribe({
      next: (res: any) => {
        if (res && res.repositories && res.repositories.length > 0) {
          this.repositories = res.repositories;
        } else {
          this.repositories = [];
          this.reposError = 'No repositories found on backend.';
        }
        this.isLoadingRepos = false;
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch repositories from backend', err);
        this.repositories = [];
        this.reposError = err.error?.detail || err.error?.message || err.message || 'Failed to load repositories.';
        this.isLoadingRepos = false;
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      }
    });
  }

  loadHomeSubscriptions(project: string) {
    this.azureApi.getSubscriptions(project).subscribe({
      next: (res: any) => {
        let subs = [];
        if (res && res.subscriptions && res.subscriptions.length > 0) {
          subs = res.subscriptions;
        } else if (res && Array.isArray(res) && res.length > 0) {
          subs = res;
        }

        if (subs && subs.length > 0) {
          this.selectedHomeSubscriptionId = subs[0].subscriptionId;
          this.loadHomeYearlyCost(this.selectedHomeSubscriptionId, project);
        } else {
          this.selectedHomeSubscriptionId = '';
          this.yearlyCost = 0;
        }
      },
      error: () => {
        this.selectedHomeSubscriptionId = '';
        this.yearlyCost = 0;
      }
    });
  }

  loadHomeYearlyCost(subId: string, project: string) {
    this.isLoadingYearlyCost = true;
    this.yearlyCostError = null;
    this.azureApi.getYearlyCosts(subId, project).subscribe({
      next: (res: any) => {
        const rows = res?.rows || res?.yearly_costs || [];
        if (rows && rows.length > 0 && rows[0].length > 0) {
          this.yearlyCost = rows.reduce((sum: number, row: any[]) => sum + (row[0] || 0), 0);
        } else {
          this.yearlyCost = 0;
        }
        this.isLoadingYearlyCost = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.yearlyCost = 0;
        this.yearlyCostError = err.error?.detail || err.error?.message || err.message || 'Failed to load yearly cost.';
        this.isLoadingYearlyCost = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadActivePipelinesCount() {
    this.activePipelinesError = null;
    this.pipelinesApi.getActivePipelinesCount().subscribe({
      next: (res: any) => {
        if (res && res.success && res.count !== undefined) {
          this.activePipelinesCount = res.count;
        } else if (res && !res.success) {
          this.activePipelinesCount = 0;
          this.activePipelinesError = res?.message || 'Failed to get active pipelines count.';
        } else {
          this.activePipelinesCount = 0;
          this.activePipelinesError = 'Invalid response format for active pipelines count.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.activePipelinesCount = 0;
        this.activePipelinesError = err.error?.detail || err.error?.message || err.message || 'Failed to get active pipelines count.';
        this.cdr.detectChanges();
      }
    });
  }

  loadTrendData() {
    this.trendDataError = null;
    this.azureApi.getCostTrend(this.selectedHomeAzureProject).subscribe({
      next: (res: any) => {
        if (res && res.trend && res.trend.length > 0) {
          this.trendData = res.trend;
          this.trendMonths = res.trend.map((d: any) => d.month);

          const latest = res.trend[res.trend.length - 1];
          this.selectedTrendMonth = latest.month;
          this.monthlyCostTotal = latest.cost;

          this.generateChartPoints();
        } else {
          this.trendData = [];
          this.trendMonths = [];
          this.monthlyCostTotal = 0;
          this.trendDataError = 'No cost trend data returned.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load cost trend data', err);
        this.trendData = [];
        this.trendMonths = [];
        this.monthlyCostTotal = 0;
        this.trendDataError = err.error?.detail || err.error?.message || err.message || 'Failed to load cost trend data.';
        this.cdr.detectChanges();
      }
    });
  }

  loadServicesStatus() {
    this.servicesStatusError = null;
    this.statusApi.getServicesStatus().subscribe({
      next: (res: any) => {
        if (res && res.length > 0) {
          this.servicesStatus = res;
        } else {
          this.servicesStatus = [];
          this.servicesStatusError = 'No services status data found.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load services status', err);
        this.servicesStatus = [];
        this.servicesStatusError = err.error?.detail || err.error?.message || err.message || 'Failed to load services status.';
        this.cdr.detectChanges();
      }
    });
  }

  calculateProjectDistribution() {
    if (!this.projects.length || !this.repositories.length) {
      this.projectDistribution = [];
      this.pieChartStyle = '';
      return;
    }

    const counts: { [key: string]: number } = {};
    this.projects.forEach(p => {
      counts[p.name] = 0;
    });

    this.repositories.forEach(r => {
      if (counts[r.project] !== undefined) {
        counts[r.project]++;
      } else {
        counts[r.project] = 1;
      }
    });

    const totalRepos = this.repositories.length;
    let accumulatedDegrees = 0;
    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];

    const dist: any[] = [];
    const gradientParts: string[] = [];

    this.projects.forEach((proj, index) => {
      const count = counts[proj.name] || 0;
      const percentage = totalRepos > 0 ? (count / totalRepos) : 0;
      const degrees = Math.round(percentage * 360);
      const color = colors[index % colors.length];

      dist.push({
        name: proj.name,
        count: count,
        color: color
      });

      if (count > 0) {
        const nextDegrees = accumulatedDegrees + degrees;
        gradientParts.push(`${color} ${accumulatedDegrees}deg ${nextDegrees}deg`);
        accumulatedDegrees = nextDegrees;
      }
    });

    if (gradientParts.length > 0 && accumulatedDegrees > 0) {
      const lastIndex = gradientParts.length - 1;
      const part = gradientParts[lastIndex];
      const match = part.match(/^(.+?)\s+(\d+)deg\s+(\d+)deg$/);
      if (match) {
        gradientParts[lastIndex] = `${match[1]} ${match[2]}deg 360deg`;
      }
    }

    this.projectDistribution = dist;
    this.pieChartStyle = gradientParts.length > 0 ? `conic-gradient(${gradientParts.join(', ')})` : 'gray';
  }

  generateChartPoints(): void {
    if (!this.trendData?.length) {
      this.polylinePoints = '';
      this.circlePoints = [];
      this.yAxisLabels = [];
      return;
    }

    const actualMax = Math.max(...this.trendData.map(d => d.cost));
    const maxVal = this.getNiceMax(actualMax);

    const chartLeft = 55;
    const chartRight = 585;
    const chartTop = 30;
    const chartBottom = 255;

    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    const points: string[] = [];
    const circles: any[] = [];
    const totalPoints = this.trendData.length;

    this.trendData.forEach((item, index) => {
      const cx = totalPoints > 1
        ? chartLeft + (index * chartWidth) / (totalPoints - 1)
        : chartLeft + chartWidth / 2;

      const cy = chartBottom - (item.cost / maxVal) * chartHeight;
      points.push(`${cx},${cy}`);

      circles.push({
        cx,
        cy,
        cost: item.cost,
        month: item.month
      });
    });

    this.polylinePoints = points.join(' ');
    this.circlePoints = circles;
    this.generateYAxisLabels(maxVal);
  }

  private getNiceMax(value: number): number {
    if (value <= 0) return 1000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const normalized = value / magnitude;
    let niceNormalized: number;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 5) niceNormalized = 5;
    else niceNormalized = 10;
    return niceNormalized * magnitude;
  }

  generateYAxisLabels(maxVal: number): void {
    const intervals = 5;
    this.yAxisLabels = [];
    for (let i = intervals; i >= 0; i--) {
      const value = (maxVal * i) / intervals;
      this.yAxisLabels.push(this.formatYAxisValue(value));
    }
  }

  private formatYAxisValue(value: number): string {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) {
      const k = value / 1000;
      return Number.isInteger(k) ? `${k}K` : `${k.toFixed(1)}K`;
    }
    return Math.round(value).toString();
  }

  onHomeAzureProjectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const proj = select.value;
    this.selectedHomeAzureProject = proj;
    this.selectedHomeSubscriptionId = '';
    this.yearlyCost = 0;

    if (!proj) {
      this.trendData = [];
      this.circlePoints = [];
      this.polylinePoints = '';
      this.yAxisLabels = [];
      return;
    }
    this.loadTrendData();
    this.loadHomeSubscriptions(proj);
  }

  getProjectDescription(projName: string): string {
    const p = this.projects.find(x => x.name === projName);
    return p ? p.description || 'N/A' : 'N/A';
  }

  getProjectState(projName: string): string {
    const p = this.projects.find(x => x.name === projName);
    return p ? p.state || 'Active' : 'Active';
  }

  getProjectVisibility(projName: string): string {
    const p = this.projects.find(x => x.name === projName);
    return p ? p.visibility || 'Private' : 'Private';
  }

  openProjectDistributionDetailsModal() {
    this.showProjectDistributionDetails = true;
  }

  closeProjectDistributionDetailsModal() {
    this.showProjectDistributionDetails = false;
  }
}
