import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

// API Services imports
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { RepositoriesApiService } from '../../../../services/api/repositories-api.service';
import { PipelinesApiService } from '../../../../services/api/pipelines-api.service';
import { AzureApiService } from '../../../../services/api/azure-api.service';
import { StatusApiService } from '../../../../services/api/status-api.service';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.html',
  styleUrl: '../../home.css',
  imports: [CommonModule, FormsModule]
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

  // Global aggregate combined cost
  combinedYearlyCost = 0;
  isLoadingCombinedCost = false;
  combinedCostError: string | null = null;

  // Multi-project cost trend properties
  isLoadingMultiTrend = false;
  multiTrendError: string | null = null;
  projectTrends: any[] = [];

  // Selections
  selectedHomeAzureProject = '';
  selectedHomeSubscriptionId = '';
  selectedTrendMonth = '';
  monthlyCostTotal = 0;

  // Chart Properties
  pieChartStyle = '';
  yAxisLabels: string[] = [];
  trendMonths: string[] = [];

  // Pie legend filter
  pieSearchQuery = '';

  get filteredProjectDistribution(): any[] {
    if (!this.pieSearchQuery?.trim()) return this.projectDistribution;
    const q = this.pieSearchQuery.trim().toLowerCase();
    return this.projectDistribution.filter(item => item.name.toLowerCase().includes(q));
  }

  // Project distribution popup
  showProjectDistributionDetails = false;

  // Error States
  projectsError: string | null = null;
  reposError: string | null = null;
  activePipelinesError: string | null = null;
  yearlyCostError: string | null = null;
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
    this.loadCombinedYearlyCost();
    this.loadMultiProjectTrends();
    this.loadServicesStatus();
    this.loadAzureProjects();
  }

  loadAzureProjects() {
    this.azureApi.getAzureProjects().subscribe({
      next: (res: any) => {
        if (res && res.projects) {
          this.azureProjects = res.projects;
          this.cdr.detectChanges();
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

  loadCombinedYearlyCost() {
    this.isLoadingCombinedCost = true;
    this.combinedCostError = null;
    this.azureApi.getCombinedYearlyCost().subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.combinedYearlyCost = res.yearly_cost;
        } else {
          this.combinedYearlyCost = 0;
        }
        this.isLoadingCombinedCost = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load combined yearly cost', err);
        this.combinedYearlyCost = 0;
        this.combinedCostError = err.error?.detail || err.error?.message || err.message || 'Failed to load combined yearly cost.';
        this.isLoadingCombinedCost = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadMultiProjectTrends() {
    this.isLoadingMultiTrend = true;
    this.multiTrendError = null;

    const projNames = ['AiDocFlo', 'TimeFlow', 'Integrelity'];
    const colors: { [key: string]: string } = {
      'AiDocFlo': '#2563eb',     // Blue
      'TimeFlow': '#16a34a',     // Green
      'Integrelity': '#f59e0b'   // Amber
    };

    const requests = projNames.map(proj => this.azureApi.getCostTrend(proj));

    forkJoin(requests).subscribe({
      next: (results: any[]) => {
        const trends: any[] = [];
        let allMonths: string[] = [];

        results.forEach((res, index) => {
          const projName = projNames[index];
          const color = colors[projName] || '#6b7280';
          const points = res && res.trend ? res.trend : [];
          
          if (points.length > 0 && allMonths.length === 0) {
            allMonths = points.map((p: any) => p.month);
          }

          trends.push({
            projectName: projName,
            color: color,
            points: points,
            polylinePoints: '',
            circlePoints: []
          });
        });

        this.projectTrends = trends;
        this.trendMonths = allMonths;
        this.generateMultiLineChartPoints();
        this.isLoadingMultiTrend = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load multi-project cost trends', err);
        this.multiTrendError = 'Failed to load multi-project cost trends.';
        this.isLoadingMultiTrend = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadServicesStatus(project?: string) {
    this.servicesStatusError = null;
    this.statusApi.getServicesStatus(project).subscribe({
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

    const colors = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#3b82f6'];
    const greyColor = '#d1d5db'; // grey for non-selected sectors
    const dist: any[] = [];
    const gradientParts: string[] = [];

    // Always show global distribution across all projects
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

    this.projects.forEach((proj, index) => {
      const count = counts[proj.name] || 0;
      const percentage = totalRepos > 0 ? (count / totalRepos) : 0;
      const degrees = Math.round(percentage * 360);

      // If a project is selected, grey out all non-selected sectors
      const isSelected = !this.selectedHomeAzureProject || proj.name === this.selectedHomeAzureProject;
      const originalColor = colors[index % colors.length];
      const color = isSelected ? originalColor : greyColor;

      dist.push({
        name: proj.name,
        count: count,
        color: color,
        isSelected: isSelected
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

  // Returns the subset of trends to display based on the selected project
  get visibleTrends(): any[] {
    if (!this.selectedHomeAzureProject) {
      return this.projectTrends;
    }
    const filtered = this.projectTrends.filter(t => t.projectName === this.selectedHomeAzureProject);
    // If the selected project is not among the tracked trend projects, show all
    return filtered.length > 0 ? filtered : this.projectTrends;
  }

  generateMultiLineChartPoints(): void {
    if (!this.projectTrends || this.projectTrends.length === 0) {
      this.yAxisLabels = [];
      return;
    }

    let globalMax = 0;
    this.projectTrends.forEach(trend => {
      trend.points.forEach((p: any) => {
        if (p.cost > globalMax) {
          globalMax = p.cost;
        }
      });
    });

    const maxVal = this.getNiceMax(globalMax);
    this.generateYAxisLabels(maxVal);

    const chartLeft = 55;
    const chartRight = 585;
    const chartTop = 30;
    const chartBottom = 255;

    const chartWidth = chartRight - chartLeft;
    const chartHeight = chartBottom - chartTop;

    this.projectTrends.forEach(trend => {
      const points: string[] = [];
      const circles: any[] = [];
      const totalPoints = trend.points.length;

      trend.points.forEach((item: any, index: number) => {
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

      trend.polylinePoints = points.join(' ');
      trend.circlePoints = circles;
    });
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

    this.calculateProjectDistribution();

    if (!proj) {
      this.yearlyCost = 0;
      this.servicesStatus = [];
      this.loadServicesStatus();
      return;
    }
    this.loadHomeSubscriptions(proj);
    this.loadServicesStatus(proj);
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