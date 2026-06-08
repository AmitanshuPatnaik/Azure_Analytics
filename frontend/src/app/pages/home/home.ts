import { Component, OnInit } from '@angular/core';
import { Sidebar } from '../../components/sidebar/sidebar';
import { DashboardService } from '../../services/dashboard.service';
import { CommonModule } from '@angular/common';

// API Services imports
import { ProjectsApiService } from '../../services/api/projects-api.service';
import { RepositoriesApiService } from '../../services/api/repositories-api.service';
import { PipelinesApiService } from '../../services/api/pipelines-api.service';
import { BoardsApiService } from '../../services/api/boards-api.service';
import { TestPlansApiService } from '../../services/api/testplans-api.service';
import { AzureApiService } from '../../services/api/azure-api.service';

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

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private reposApi: RepositoriesApiService,
    private pipelinesApi: PipelinesApiService,
    private boardsApi: BoardsApiService,
    private testPlansApi: TestPlansApiService,
    private azureApi: AzureApiService
  ) {}

  ngOnInit() {
    this.loadProjects();
    this.loadRepositories();
    this.loadSubscriptions();
  }

  // --- Loader functions ---

  loadProjects() {
    this.isLoadingProjects = true;
    this.projectsApi.getProjects().subscribe({
      next: (res: any) => {
        if (res && res.projects && res.projects.length > 0) {
          this.projects = res.projects;
        } else {
          console.warn('Backend returned empty projects list, using fallbacks');
          this.projects = this.mockProjects;
        }
        this.isLoadingProjects = false;
      },
      error: (err) => {
        console.warn('Could not fetch projects from backend, using fallbacks', err);
        this.projects = this.mockProjects;
        this.isLoadingProjects = false;
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
      },
      error: (err) => {
        console.warn('Could not fetch repositories from backend, using fallbacks', err);
        this.repositories = this.mockRepos;
        this.isLoadingRepos = false;
      }
    });
  }

  loadSubscriptions() {
    this.azureApi.getSubscriptions().subscribe({
      next: (res: any) => {
        if (res && res.subscriptions && res.subscriptions.length > 0) {
          this.subscriptions = res.subscriptions;
        } else if (res && Array.isArray(res) && res.length > 0) {
          this.subscriptions = res;
        } else {
          this.subscriptions = this.mockSubs;
        }
      },
      error: (err) => {
        console.warn('Could not fetch Azure subscriptions, using fallbacks', err);
        this.subscriptions = this.mockSubs;
      }
    });
  }

  // --- Handlers & Getters ---

  openProject(project: any) {
    this.selectedProject = project;
    this.showProjectDetails = true;
  }

  closeProjectModal() {
    this.showProjectDetails = false;
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

    this.isLoadingPipelines = true;
    this.pipelinesApi.getPipelines(projName).subscribe({
      next: (res: any) => {
        if (res && res.pipelines && res.pipelines.length > 0) {
          this.pipelines = res.pipelines;
        } else {
          this.pipelines = this.mockPipelines;
        }
        this.isLoadingPipelines = false;
      },
      error: (err) => {
        console.warn(`Could not load pipelines for project ${projName}, using fallbacks`, err);
        this.pipelines = this.mockPipelines;
        this.isLoadingPipelines = false;
      }
    });
  }

  onBoardProjectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const projName = select.value;
    this.selectedBoardProject = projName;

    if (!projName) {
      this.workItems = [];
      return;
    }

    this.isLoadingWorkItems = true;
    this.boardsApi.getWorkItems(projName).subscribe({
      next: (res: any) => {
        if (res && res.workItems && res.workItems.length > 0) {
          this.workItems = res.workItems;
        } else {
          this.workItems = this.mockWorkItems;
        }
        this.isLoadingWorkItems = false;
      },
      error: (err) => {
        console.warn(`Could not load work items for project ${projName}, using fallbacks`, err);
        this.workItems = this.mockWorkItems;
        this.isLoadingWorkItems = false;
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

    this.isLoadingTestPlans = true;
    this.testPlansApi.getTestPlans(projName).subscribe({
      next: (res: any) => {
        if (res && res.test_plans && res.test_plans.length > 0) {
          this.testPlans = res.test_plans;
        } else {
          this.testPlans = this.mockTestPlans;
        }
        this.isLoadingTestPlans = false;
      },
      error: (err) => {
        console.warn(`Could not load test plans for project ${projName}, using fallbacks`, err);
        this.testPlans = this.mockTestPlans;
        this.isLoadingTestPlans = false;
      }
    });
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

    this.isLoadingAzure = true;

    // Load costs total
    this.azureApi.getTotalCost(subId).subscribe({
      next: (res: any) => {
        this.totalCost = res && res.total_cost !== undefined ? res.total_cost : 42860;
      },
      error: () => this.totalCost = 42860
    });

    // Load budgets
    this.azureApi.getBudgets(subId).subscribe({
      next: (res: any) => {
        this.budgets = res && res.budgets ? res.budgets : [];
      },
      error: () => this.budgets = []
    });

    // Load top resources
    this.azureApi.getTopResources(subId).subscribe({
      next: (res: any) => {
        this.topResources = res && res.top_resources ? res.top_resources : [
          [15400, 'AKS-Cluster-Primary'],
          [9800, 'SQL-Database-Prod'],
          [5400, 'VM-AppServer-01'],
          [3100, 'StorageAccountLogs']
        ];
      },
      error: () => this.topResources = [
        [15400, 'AKS-Cluster-Primary'],
        [9800, 'SQL-Database-Prod'],
        [5400, 'VM-AppServer-01'],
        [3100, 'StorageAccountLogs']
      ]
    });

    // Load service costs
    this.azureApi.getServiceCosts(subId).subscribe({
      next: (res: any) => {
        this.serviceCosts = res && res.services ? res.services : [
          [18500, 'Virtual Machines'],
          [15400, 'Azure Kubernetes Service'],
          [6400, 'Azure SQL Database'],
          [2560, 'Storage Accounts']
        ];
        this.isLoadingAzure = false;
      },
      error: () => {
        this.serviceCosts = [
          [18500, 'Virtual Machines'],
          [15400, 'Azure Kubernetes Service'],
          [6400, 'Azure SQL Database'],
          [2560, 'Storage Accounts']
        ];
        this.isLoadingAzure = false;
      }
    });
  }

}