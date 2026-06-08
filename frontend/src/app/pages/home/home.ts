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
  totalCost = 42860;
  budgets: any[] = [];
  topResources: any[] = [];
  serviceCosts: any[] = [];
  isLoadingAzure = false;

  // New properties for dynamic bindings
  monthlyCostTotal = 42860;
  activePipelinesCount = 18;
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

  // Fallback structures for empty check
  private mockServicesStatus = [
    { service: 'Azure DevOps', status: 'Healthy' },
    { service: 'CI/CD Pipelines', status: 'Healthy' },
    { service: 'Azure Monitor', status: 'Warning' },
    { service: 'Azure Storage', status: 'Healthy' },
    { service: 'AKS Cluster', status: 'Healthy' }
  ];

  // Mock datasets for fallbacks
  private mockProjects = [
    { id: 'PROJ-001', name: 'CI/CD Automation Platform', description: 'End-to-end CI/CD automation platform', state: 'Active', visibility: 'Private', url: 'https://dev.azure.com/project1' },
    { id: 'PROJ-002', name: 'Infrastructure Monitoring', description: 'Infrastructure monitoring system', state: 'Active', visibility: 'Private', url: 'https://dev.azure.com/project2' },
    { id: 'PROJ-003', name: 'Cloud Cost Optimizer', description: 'Cloud cost optimization solution', state: 'Active', visibility: 'Public', url: 'https://dev.azure.com/project3' },
    { id: 'PROJ-004', name: 'Release Management Portal', description: 'Release management platform', state: 'Active', visibility: 'Private', url: 'https://dev.azure.com/project4' },
    { id: 'PROJ-005', name: 'Log Analytics Dashboard', description: 'Log analytics system', state: 'Active', visibility: 'Private', url: 'https://dev.azure.com/project5' },
    { id: 'PROJ-006', name: 'Container Deployment Manager', description: 'Kubernetes deployment manager', state: 'Critical', visibility: 'Private', url: 'https://dev.azure.com/project6' }
  ];

  private mockRepos = [
    { id: 'repo-1', name: 'frontend-ui', project: 'CI/CD Automation Platform', defaultBranch: 'refs/heads/main', remoteUrl: 'https://dev.azure.com/project1/frontend-ui' },
    { id: 'repo-2', name: 'backend-api', project: 'CI/CD Automation Platform', defaultBranch: 'refs/heads/main', remoteUrl: 'https://dev.azure.com/project1/backend-api' },
    { id: 'repo-3', name: 'devops-scripts', project: 'Infrastructure Monitoring', defaultBranch: 'refs/heads/main', remoteUrl: 'https://dev.azure.com/project2/devops-scripts' }
  ];

  private mockPipelines = [
    { id: 'pipe-1', name: 'Frontend Build', folder: '/CI-CD', url: 'https://dev.azure.com/pipelines/1' },
    { id: 'pipe-2', name: 'Backend Deploy', folder: '/Deployments', url: 'https://dev.azure.com/pipelines/2' },
    { id: 'pipe-3', name: 'Production Release', folder: '/Releases', url: 'https://dev.azure.com/pipelines/3' }
  ];

  private mockWorkItems = [
    { id: 101, title: 'User Authentication Module', type: 'Feature', state: 'Completed', assignedTo: 'John Doe' },
    { id: 102, title: 'UI Enhancement', type: 'User Story', state: 'In Progress', assignedTo: 'Jane Smith' },
    { id: 103, title: 'API Integration', type: 'Task', state: 'Pending', assignedTo: 'Alex Johnson' }
  ];

  private mockTestPlans = [
    { id: 201, name: 'Login Testing', owner: 'Jane Smith', state: 'Passed', startDate: '2026-06-01', endDate: '2026-06-03' },
    { id: 202, name: 'API Testing', owner: 'John Doe', state: 'Passed', startDate: '2026-06-02', endDate: '2026-06-04' },
    { id: 203, name: 'Performance Testing', owner: 'Sarah Connor', state: 'Running', startDate: '2026-06-05', endDate: '2026-06-10' }
  ];

  private mockSubs = [
    { subscriptionId: 'sub-dev-01', displayName: 'DevOps-Development-Subscription' },
    { subscriptionId: 'sub-prod-02', displayName: 'DevOps-Production-Subscription' }
  ];

  // Mock repo details
  private mockCommits = [
    { commitId: 'c1', author: 'John Doe', date: '2026-06-08', comment: 'Initial commit' },
    { commitId: 'c2', author: 'Jane Smith', date: '2026-06-08', comment: 'Update README' }
  ];
  private mockPRs = [
    { pullRequestId: 1, title: 'Feature: User Login', createdBy: 'Jane Smith', creationDate: '2026-06-07', status: 'Active' }
  ];
  private mockBranches = [
    { name: 'main', objectId: 'b1' },
    { name: 'develop', objectId: 'b2' }
  ];
  private mockPushes = [
    { pushId: 1, date: '2026-06-08', pushedBy: 'John Doe' }
  ];

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
    this.projectsApi.getProjects().subscribe({
      next: (res: any) => {
        if (res && res.success && res.projects && res.projects.length > 0) {
          this.projects = res.projects;
        } else if (res && res.projects && res.projects.length > 0) {
          this.projects = res.projects;
        } else {
          console.warn('Backend returned empty projects list, using fallbacks');
          this.projects = this.mockProjects;
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
        console.warn('Could not fetch projects from backend, using fallbacks', err);
        this.projects = this.mockProjects;
        this.isLoadingProjects = false;
        if (this.projects.length > 0) {
          const firstProjName = this.projects[0].name;
          this.selectedPipelineProject = firstProjName;
          this.selectedBoardProject = firstProjName;
          this.selectedTestPlanProject = firstProjName;
          this.loadPipelines(firstProjName);
          this.loadWorkItems(firstProjName);
          this.loadTestPlans(firstProjName);
        }
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      }
    });
  }

  loadRepositories() {
    this.isLoadingRepos = true;
    this.reposApi.getAllRepositories().subscribe({
      next: (res: any) => {
        if (res && res.repositories && res.repositories.length > 0) {
          this.repositories = res.repositories;
        } else {
          console.warn('Backend returned empty repositories list, using fallbacks');
          this.repositories = this.mockRepos;
        }
        this.isLoadingRepos = false;
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch repositories from backend, using fallbacks', err);
        this.repositories = this.mockRepos;
        this.isLoadingRepos = false;
        this.calculateProjectDistribution();
        this.cdr.detectChanges();
      }
    });
  }

  loadSubscriptions() {
    this.azureApi.getSubscriptions().subscribe({
      next: (res: any) => {
        let subs = [];
        if (res && res.subscriptions && res.subscriptions.length > 0) {
          subs = res.subscriptions;
        } else if (res && Array.isArray(res) && res.length > 0) {
          subs = res;
        } else {
          subs = this.mockSubs;
        }
        this.subscriptions = subs;

        // Auto-select first subscription to load Azure costs immediately on page open
        if (subs.length > 0 && !this.selectedSubscriptionId) {
          this.selectedSubscriptionId = subs[0].subscriptionId;
          this.loadSubscriptionMetrics(this.selectedSubscriptionId);
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Could not fetch Azure subscriptions, using fallbacks', err);
        this.subscriptions = this.mockSubs;
        if (this.mockSubs.length > 0 && !this.selectedSubscriptionId) {
          this.selectedSubscriptionId = this.mockSubs[0].subscriptionId;
          this.loadSubscriptionMetrics(this.selectedSubscriptionId);
        }
        this.cdr.detectChanges();
      }
    });
  }

  loadActivePipelinesCount() {
    this.pipelinesApi.getActivePipelinesCount().subscribe({
      next: (res: any) => {
        if (res && res.count !== undefined) {
          this.activePipelinesCount = res.count;
        } else {
          this.activePipelinesCount = 18;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.activePipelinesCount = 18;
        this.cdr.detectChanges();
      }
    });
  }

  loadTrendData() {
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
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.trendData = [
          { month: 'January', cost: 15000 },
          { month: 'February', cost: 22000 },
          { month: 'March', cost: 28000 },
          { month: 'April', cost: 31000 },
          { month: 'May', cost: 38000 },
          { month: 'June', cost: 42860 }
        ];
        this.trendMonths = this.trendData.map(d => d.month);
        this.selectedTrendMonth = 'June';
        this.monthlyCostTotal = 42860;
        this.generateChartPoints();
        this.cdr.detectChanges();
      }
    });
  }

  loadServicesStatus() {
    this.statusApi.getServicesStatus().subscribe({
      next: (res: any) => {
        if (res && res.length > 0) {
          this.servicesStatus = res;
        } else {
          this.servicesStatus = this.mockServicesStatus;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.servicesStatus = this.mockServicesStatus;
        this.cdr.detectChanges();
      }
    });
  }

  loadPipelines(projName: string) {
    this.isLoadingPipelines = true;
    this.pipelinesApi.getPipelines(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.pipelines = res.pipelines || [];
        } else {
          this.pipelines = this.mockPipelines;
        }
        this.isLoadingPipelines = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load pipelines for project ${projName}, using fallbacks`, err);
        this.pipelines = this.mockPipelines;
        this.isLoadingPipelines = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadWorkItems(projName: string) {
    this.isLoadingWorkItems = true;
    this.boardsApi.getWorkItems(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.workItems = res.workItems || [];
        } else {
          this.workItems = this.mockWorkItems;
        }
        this.isLoadingWorkItems = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load work items for project ${projName}, using fallbacks`, err);
        this.workItems = this.mockWorkItems;
        this.isLoadingWorkItems = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadTestPlans(projName: string) {
    this.isLoadingTestPlans = true;
    this.testPlansApi.getTestPlans(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.testPlans = res.test_plans || [];
        } else {
          this.testPlans = this.mockTestPlans;
        }
        this.isLoadingTestPlans = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load test plans for project ${projName}, using fallbacks`, err);
        this.testPlans = this.mockTestPlans;
        this.isLoadingTestPlans = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSubscriptionMetrics(subId: string) {
    this.isLoadingAzure = true;
    
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
        this.totalCost = res.total && res.total.total_cost !== undefined ? res.total.total_cost : 42860;
        
        this.budgets = res.budgets && res.budgets.budgets && res.budgets.budgets.length > 0
          ? res.budgets.budgets
          : [
              { name: 'Monthly-DevOps-Budget', amount: 50000, timeGrain: 'Monthly' }
            ];

        this.topResources = res.topResources && res.topResources.top_resources && res.topResources.top_resources.length > 0
          ? res.topResources.top_resources
          : [
              [15400, 'AKS-Cluster-Primary'],
              [9800, 'SQL-Database-Prod'],
              [5400, 'VM-AppServer-01'],
              [3100, 'StorageAccountLogs']
            ];

        this.serviceCosts = res.services && res.services.services && res.services.services.length > 0
          ? res.services.services
          : [
              [18500, 'Virtual Machines'],
              [15400, 'Azure Kubernetes Service'],
              [6400, 'Azure SQL Database'],
              [2560, 'Storage Accounts']
            ];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error loading Azure subscription metrics, using fallbacks', err);
        this.totalCost = 42860;
        this.budgets = [
          { name: 'Monthly-DevOps-Budget', amount: 50000, timeGrain: 'Monthly' }
        ];
        this.topResources = [
          [15400, 'AKS-Cluster-Primary'],
          [9800, 'SQL-Database-Prod'],
          [5400, 'VM-AppServer-01'],
          [3100, 'StorageAccountLogs']
        ];
        this.serviceCosts = [
          [18500, 'Virtual Machines'],
          [15400, 'Azure Kubernetes Service'],
          [6400, 'Azure SQL Database'],
          [2560, 'Storage Accounts']
        ];
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
      this.totalCost = 42860;
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
    this.reposApi.getCommits(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.commits) {
          this.repoCommits = res.commits;
        } else {
          this.repoCommits = this.mockCommits;
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.repoCommits = this.mockCommits;
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRepoPRs(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'prs';
    this.isLoadingRepoDetails = true;
    this.reposApi.getPullRequests(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.pullRequests) {
          this.repoPRs = res.pullRequests;
        } else {
          this.repoPRs = this.mockPRs;
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.repoPRs = this.mockPRs;
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRepoBranches(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'branches';
    this.isLoadingRepoDetails = true;
    this.reposApi.getBranches(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.branches) {
          this.repoBranches = res.branches;
        } else {
          this.repoBranches = this.mockBranches;
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.repoBranches = this.mockBranches;
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewRepoPushes(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'pushes';
    this.isLoadingRepoDetails = true;
    this.reposApi.getPushes(this.selectedProject.name, repo.name).subscribe({
      next: (res: any) => {
        if (res && res.success && res.pushes) {
          this.repoPushes = res.pushes;
        } else {
          this.repoPushes = this.mockPushes;
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.repoPushes = this.mockPushes;
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
      }
    });
  }
}