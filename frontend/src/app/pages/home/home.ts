import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';
import { DashboardService } from '../../services/dashboard.service';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

// API Services imports
import { ProjectsApiService } from '../../services/api/projects-api.service';
import { RepositoriesApiService } from '../../services/api/repositories-api.service';
import { PipelinesApiService } from '../../services/api/pipelines-api.service';
import { BoardsApiService } from '../../services/api/boards-api.service';
import { TestPlansApiService } from '../../services/api/testplans-api.service';
import { AzureApiService } from '../../services/api/azure-api.service';
import { StatusApiService } from '../../services/api/status-api.service';

@Component({
  selector: 'app-home',
  imports: [Sidebar, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit {

  showProjectDetails = false;
  selectedProject: any = null;

  // Real data arrays
  projects: any[] = [];
  repositories: any[] = [];
  subscriptions: any[] = [];

  // Filtering / Loading states
  selectedProjectFilter = '';
  isLoadingProjects = false;
  isLoadingRepos = false;

  // Pipelines state
  selectedPipelineProject = '';
  pipelines: any[] = [];
  isLoadingPipelines = false;

  // Boards state
  selectedBoardProject = '';
  workItems: any[] = [];
  isLoadingWorkItems = false;

  // Test Plans state
  selectedTestPlanProject = '';
  testPlans: any[] = [];
  isLoadingTestPlans = false;

  // Azure state
  selectedSubscriptionId = '';
  totalCost = 0;
  budgets: any[] = [];
  topResources: any[] = [];
  serviceCosts: any[] = [];
  isLoadingAzure = false;

  // New properties for dynamic bindings
  monthlyCostTotal = 0;
  activePipelinesCount = 0;
  projectDistribution: any[] = [];
  pieChartStyle = '';
  trendData: any[] = [];
  trendMonths: string[] = [];
  selectedTrendMonth = '';
  polylinePoints = '';
  circlePoints: any[] = [];
  yAxisLabels: string[] = [];
  servicesStatus: any[] = [];

  // Project distribution popup
  showProjectDistributionDetails = false;

  // Repository details/operations modal variables
  selectedProjectRepos: any[] = [];
  selectedRepoForDetails: any = null;
  activeRepoDetailsTab = '';
  repoCommits: any[] = [];
  repoPRs: any[] = [];
  repoBranches: any[] = [];
  repoPushes: any[] = [];
  isLoadingRepoDetails = false;

  // Error state properties for UI feedback
  projectsError: string | null = null;
  reposError: string | null = null;
  subscriptionsError: string | null = null;
  pipelinesError: string | null = null;
  workItemsError: string | null = null;
  testPlansError: string | null = null;
  azureError: string | null = null;
  trendDataError: string | null = null;
  servicesStatusError: string | null = null;
  activePipelinesError: string | null = null;
  repoDetailsError: string | null = null;

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private reposApi: RepositoriesApiService,
    private pipelinesApi: PipelinesApiService,
    private boardsApi: BoardsApiService,
    private testPlansApi: TestPlansApiService,
    private azureApi: AzureApiService,
    private statusApi: StatusApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.dashboardService.selectedPage$.subscribe({
      next: (page) => {
        this.onPageActive(page);
      }
    });
  }

  onPageActive(page: string) {
    if (page === 'home') {
      this.loadProjects();
      this.loadRepositories();
      this.loadSubscriptions();
      this.loadActivePipelinesCount();
      this.loadTrendData();
      this.loadServicesStatus();
    } else if (page === 'repos') {
      this.loadRepositories();
    } else if (page === 'pipelines') {
      if (this.selectedPipelineProject) {
        this.loadPipelines(this.selectedPipelineProject);
      }
    } else if (page === 'boards') {
      if (this.selectedBoardProject) {
        this.loadWorkItems(this.selectedBoardProject);
      }
    } else if (page === 'testplans') {
      if (this.selectedTestPlanProject) {
        this.loadTestPlans(this.selectedTestPlanProject);
      }
    } else if (page === 'azure') {
      if (this.selectedSubscriptionId) {
        this.loadSubscriptionMetrics(this.selectedSubscriptionId);
      } else {
        this.loadSubscriptions();
      }
    }
  }

  // --- Loader functions ---

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

        if (projs && projs.length > 0) {
          this.projects = projs;
        } else {
          this.projects = [];
          this.projectsError = res?.message || 'No projects returned from backend.';
        }
        this.isLoadingProjects = false;

        // Auto-select first project to load DevOps lists immediately on page open
        if (this.projects.length > 0) {
          const firstProjName = this.projects[0].name;
          if (!this.selectedPipelineProject) {
            this.selectedPipelineProject = firstProjName;
            this.loadPipelines(firstProjName);
          }
          if (!this.selectedBoardProject) {
            this.selectedBoardProject = firstProjName;
            this.loadWorkItems(firstProjName);
          }
          if (!this.selectedTestPlanProject) {
            this.selectedTestPlanProject = firstProjName;
            this.loadTestPlans(firstProjName);
          }
        }
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

  loadSubscriptions() {
    this.subscriptionsError = null;
    this.azureApi.getSubscriptions().subscribe({
      next: (res: any) => {
        let subs = [];
        if (res && res.subscriptions && res.subscriptions.length > 0) {
          subs = res.subscriptions;
        } else if (res && Array.isArray(res) && res.length > 0) {
          subs = res;
        }
        
        if (subs && subs.length > 0) {
          this.subscriptions = subs;
          // Auto-select first subscription to load Azure costs immediately on page open
          if (!this.selectedSubscriptionId) {
            this.selectedSubscriptionId = subs[0].subscriptionId;
            this.loadSubscriptionMetrics(this.selectedSubscriptionId);
          }
        } else {
          this.subscriptions = [];
          this.subscriptionsError = 'No Azure subscriptions found.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch Azure subscriptions', err);
        this.subscriptions = [];
        this.subscriptionsError = err.error?.detail || err.error?.message || err.message || 'Failed to load Azure subscriptions.';
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
    this.azureApi.getCostTrend().subscribe({
      next: (res: any) => {
        console.log(res)
        if (res && res.trend && res.trend.length > 0) {
          this.trendData = res.trend;
          this.trendMonths = res.trend.map((d: any) => d.month);
          
          // Set initial selection to the last month in the trend
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

  loadWorkItems(projName: string) {
    this.isLoadingWorkItems = true;
    this.workItemsError = null;
    this.boardsApi.getWorkItems(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.workItems = res.workItems || [];
        } else {
          this.workItems = [];
          this.workItemsError = res?.message || 'Failed to load work items from backend.';
        }
        this.isLoadingWorkItems = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load work items for project ${projName}`, err);
        this.workItems = [];
        this.workItemsError = err.error?.detail || err.error?.message || err.message || `Failed to load work items for project ${projName}.`;
        this.isLoadingWorkItems = false;
        this.cdr.detectChanges();
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

  loadSubscriptionMetrics(subId: string) {
    this.isLoadingAzure = true;
    this.azureError = null;
    
    const totalCost$ = this.azureApi.getTotalCost(subId);
    const budgets$ = this.azureApi.getBudgets(subId);
    const topResources$ = this.azureApi.getTopResources(subId);
    const serviceCosts$ = this.azureApi.getServiceCosts(subId);

    forkJoin({
      total: totalCost$,
      budgets: budgets$,
      topResources: topResources$,
      services: serviceCosts$
    }).pipe(
      finalize(() => {
        this.isLoadingAzure = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (res: any) => {
        this.totalCost = res.total && res.total.total_cost !== undefined ? res.total.total_cost : 0;
        
        this.budgets = res.budgets && res.budgets.budgets && res.budgets.budgets.length > 0
          ? res.budgets.budgets
          : [];

        this.topResources = res.topResources && res.topResources.top_resources && res.topResources.top_resources.length > 0
          ? res.topResources.top_resources
          : [];

        this.serviceCosts = res.services && res.services.services && res.services.services.length > 0
          ? res.services.services
          : [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error loading Azure subscription metrics', err);
        this.totalCost = 0;
        this.budgets = [];
        this.topResources = [];
        this.serviceCosts = [];
        this.azureError = err.error?.detail || err.error?.message || err.message || `Failed to load Azure subscription metrics for ${subId}.`;
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

  // Nice rounded maximum
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

    const cx =
      totalPoints > 1
        ? chartLeft + (index * chartWidth) / (totalPoints - 1)
        : chartLeft + chartWidth / 2;

    const cy =
      chartBottom -
      (item.cost / maxVal) * chartHeight;

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
  if (value <= 0) {
    return 1000;
  }

  const magnitude = Math.pow(
    10,
    Math.floor(Math.log10(value))
  );

  const normalized = value / magnitude;

  let niceNormalized: number;

  if (normalized <= 1) {
    niceNormalized = 1;
  } else if (normalized <= 2) {
    niceNormalized = 2;
  } else if (normalized <= 5) {
    niceNormalized = 5;
  } else {
    niceNormalized = 10;
  }

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

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    const k = value / 1000;

    return Number.isInteger(k)
      ? `${k}K`
      : `${k.toFixed(1)}K`;
  }

  return Math.round(value).toString();
}

onTrendMonthChange(event: Event): void {
  const select = event.target as HTMLSelectElement;

  this.selectedTrendMonth = select.value;

  const selectedPoint = this.trendData.find(
    d => d.month === this.selectedTrendMonth
  );

  if (selectedPoint) {
    this.monthlyCostTotal = selectedPoint.cost;
  }
}

  // --- Helpers for Modal templates ---

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

  // --- Handlers & Getters ---

  openProject(project: any) {
    this.selectedProject = project;
    this.selectedProjectRepos = this.repositories.filter(r => r.project === project.name);
    this.selectedRepoForDetails = null;
    this.activeRepoDetailsTab = '';
    this.showProjectDetails = true;
  }

  closeProjectModal() {
    this.showProjectDetails = false;
    this.selectedProjectRepos = [];
    this.selectedRepoForDetails = null;
    this.activeRepoDetailsTab = '';
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

  onBoardProjectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const projName = select.value;
    this.selectedBoardProject = projName;

    if (!projName) {
      this.workItems = [];
      return;
    }
    this.loadWorkItems(projName);
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

  onSubscriptionChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const subId = select.value;
    this.selectedSubscriptionId = subId;

    if (!subId) {
      this.totalCost = 0;
      this.budgets = [];
      this.topResources = [];
      this.serviceCosts = [];
      return;
    }
    this.loadSubscriptionMetrics(subId);
  }

  // --- Repository details operations handlers ---

  viewRepoCommits(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'commits';
    this.isLoadingRepoDetails = true;
    this.repoDetailsError = null;
    this.reposApi.getCommits(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.commits) {
          this.repoCommits = res.commits;
        } else {
          this.repoCommits = [];
          this.repoDetailsError = 'No commits found or failed to parse response.';
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load commits', err);
        this.repoCommits = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch commits.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRepoPRs(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'prs';
    this.isLoadingRepoDetails = true;
    this.repoDetailsError = null;
    this.reposApi.getPullRequests(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.pullRequests) {
          this.repoPRs = res.pullRequests;
        } else {
          this.repoPRs = [];
          this.repoDetailsError = 'No pull requests found or failed to parse response.';
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load pull requests', err);
        this.repoPRs = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch pull requests.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRepoBranches(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'branches';
    this.isLoadingRepoDetails = true;
    this.repoDetailsError = null;
    this.reposApi.getBranches(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.branches) {
          this.repoBranches = res.branches;
        } else {
          this.repoBranches = [];
          this.repoDetailsError = 'No branches found or failed to parse response.';
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load branches', err);
        this.repoBranches = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch branches.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRepoPushes(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'pushes';
    this.isLoadingRepoDetails = true;
    this.repoDetailsError = null;
    this.reposApi.getPushes(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.pushes) {
          this.repoPushes = res.pushes;
        } else {
          this.repoPushes = [];
          this.repoDetailsError = 'No pushes found or failed to parse response.';
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load pushes', err);
        this.repoPushes = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch pushes.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }
}