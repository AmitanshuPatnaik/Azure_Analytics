import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
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
  workItemSprints: string[] = [];          // sprint names returned by backend
  isLoadingWorkItems = false;

  // Board filter state
  boardFilterSprint = '';
  boardFilterType = '';
  boardFilterState = '';
  boardFilterAssigned = '';
  collapsedSprints: Set<string> = new Set();


  // Test Plans state
  selectedTestPlanProject = '';
  testPlans: any[] = [];
  isLoadingTestPlans = false;

  // Azure state
  selectedAzureProject = '';
  azureProjects: string[] = ['AiDocFlo', 'TimeFlow', 'Integrelity'];
  selectedSubscriptionId = '';
  totalCost = 0;
  budgets: any[] = [];
  topResources: any[] = [];
  serviceCosts: any[] = [];
  isLoadingAzure = false;

  // Cost Trend (daily range) page state
  costTrendFromDate = '';
  costTrendToDate = '';
  costTrendMinDate = '';
  costTrendPoints: { date: string; cost: number }[] = [];
  isLoadingCostTrend = false;
  costTrendError: string | null = null;
  costTrendChartWidth = 620;
  costTrendChartHeight = 260;

  // Yearly cost state
  yearlyCost = 0;
  yearlyCostError: string | null = null;
  isLoadingYearlyCost = false;

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
  @ViewChild('repoDetailsAnchor') repoDetailsAnchor!: ElementRef;
  activeRepoDetailsTab = '';
  repoCommits: any[] = [];
  repoPRs: any[] = [];
  repoBranches: any[] = [];
  repoBranchesCount: number | null = null;
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
  ) { }

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
      // Initialise daily-trend date defaults on first visit
      if (!this.costTrendFromDate) {
        const now = new Date();
        // "To" defaults to yesterday — today is incomplete (costs still accumulating)
        const yesterday = new Date(now.getTime() - 86_400_000);
        this.costTrendToDate = yesterday.toISOString().slice(0, 10);
        this.costTrendFromDate = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
        this.costTrendMinDate = `${now.getFullYear()}-01-01`;
      }
      if (this.selectedSubscriptionId) {
        this.loadSubscriptionMetrics(this.selectedSubscriptionId);
        this.loadDailyCostRange();
      } else if (this.selectedAzureProject) {
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
    this.azureApi.getSubscriptions(this.selectedAzureProject).subscribe({
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
            this.loadYearlyCost(this.selectedSubscriptionId);
            this.loadDailyCostRange();
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
    this.azureApi.getCostTrend(this.selectedAzureProject).subscribe({
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
          // Map raw Azure DevOps {value:[{id,rev,fields}]} format to flat workItem objects
          this.workItems = (res.value || []).map((item: any) => {
            const f = item.fields || {};
            const assignedTo = f['System.AssignedTo'];
            return {
              id:          item.id,
              rev:         item.rev,
              title:       f['System.Title'],
              type:        f['System.WorkItemType'],
              state:       f['System.State'],
              boardColumn: f['System.BoardColumn'],
              assignedTo:  assignedTo?.displayName || null,
              priority:    f['Microsoft.VSTS.Common.Priority'],
              severity:    f['Microsoft.VSTS.Common.Severity'] || null,
              stateChangedDate: f['Microsoft.VSTS.Common.StateChangeDate'] || null,
              startDate:   f['Microsoft.VSTS.Scheduling.StartDate'] || null,
              targetDate:  f['Microsoft.VSTS.Scheduling.TargetDate'] || null,
              sprint:      f['_sprint'] || 'No Sprint',
            };
          });
          this.workItemSprints = res.sprints || [];
        } else {
          this.workItems = [];
          this.workItemSprints = [];
          this.workItemsError = res?.message || 'Failed to load work items from backend.';
        }
        this.isLoadingWorkItems = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load work items for project ${projName}`, err);
        this.workItems = [];
        this.workItemSprints = [];
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

    const totalCost$ = this.azureApi.getTotalCost(subId, this.selectedAzureProject);
    const budgets$ = this.azureApi.getBudgets(subId, this.selectedAzureProject);
    const topResources$ = this.azureApi.getTopResources(subId, this.selectedAzureProject);
    const serviceCosts$ = this.azureApi.getServiceCosts(subId, this.selectedAzureProject);

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

  loadYearlyCost(subId: string) {
    this.isLoadingYearlyCost = true;
    this.yearlyCostError = null;
    this.azureApi.getYearlyCosts(subId, this.selectedAzureProject).subscribe({
      next: (res: any) => {
        const rows = res?.rows || res?.yearly_costs || [];
        if (rows && rows.length > 0 && rows[0].length > 0) {
          // Sum all rows to get the full year-to-date total
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

  // ── Daily cost range (Cost Trend page) ───────────────────────────────────

  loadDailyCostRange() {
    if (!this.selectedSubscriptionId || !this.costTrendFromDate || !this.costTrendToDate) return;
    this.isLoadingCostTrend = true;
    this.costTrendError = null;
    this.azureApi.getDailyCostsByRange(
      this.selectedSubscriptionId,
      this.costTrendFromDate,
      this.costTrendToDate,
      this.selectedAzureProject
    ).subscribe({
      next: (res: any) => {
        this.costTrendPoints = res?.points || [];
        this.isLoadingCostTrend = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.costTrendPoints = [];
        this.costTrendError = err.error?.detail || err.error?.message || err.message || 'Failed to load daily costs.';
        this.isLoadingCostTrend = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCostTrendDateChange() {
    // Clamp toDate to yesterday if user somehow sets it beyond
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (this.costTrendToDate > yesterday) {
      this.costTrendToDate = yesterday;
    }
    if (this.costTrendFromDate && this.costTrendToDate && this.selectedSubscriptionId) {
      this.loadDailyCostRange();
    }
  }

  /** Always returns yesterday's date (the hard maximum for both date pickers). */
  get costTrendMaxDate(): string {
    return new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  }

  // SVG chart helpers for cost-trend page
  // ── Chart Y-axis dynamic scaling ─────────────────────────────────────────

  /** Round a value DOWN to the nearest "nice" step. */
  private niceFloor(value: number): number {
    if (value <= 0) return 0;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const step = magnitude >= 1000 ? magnitude / 2 : magnitude;
    return Math.floor(value / step) * step;
  }

  /** Round a value UP to the nearest "nice" step. */
  private niceCeil(value: number): number {
    if (value <= 0) return 1;
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const step = magnitude >= 1000 ? magnitude / 2 : magnitude;
    return Math.ceil(value / step) * step;
  }

  /**
   * Returns a filtered + sorted cost array used for Y-axis scaling.
   * Excludes values < 15% of the median — these are typically today's
   * in-progress costs (e.g. ₹10 at 9am vs ₹650 for completed days)
   * that would otherwise collapse the visible variation into a flat line.
   */
  private costTrendScaleValues(): number[] {
    const costs = this.costTrendPoints.map(p => p.cost);
    if (costs.length < 2) return costs;

    const sorted = [...costs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    const filtered = sorted.filter(c => c >= median * 0.15);
    // Fall back to full array if filtering removes too many points
    return filtered.length >= Math.ceil(sorted.length * 0.5) ? filtered : sorted;
  }

  get costTrendYMin(): number {
    if (!this.costTrendPoints.length) return 0;
    const values = this.costTrendScaleValues();
    const min = values[0];
    const max = values[values.length - 1];
    const range = max - min;

    // If data is nearly flat, zoom in tightly (±8% around min)
    if (range < max * 0.005) {
      return Math.max(0, this.niceFloor(min * 0.92));
    }

    // Start axis 15% of the data-range below the minimum
    return Math.max(0, this.niceFloor(min - range * 0.15));
  }

  get costTrendYMax(): number {
    if (!this.costTrendPoints.length) return 1;
    const values = this.costTrendScaleValues();
    const max = values[values.length - 1];
    const min = values[0];
    const range = max - min;

    if (range < max * 0.005) {
      return this.niceCeil(max * 1.08);
    }

    return this.niceCeil(max + range * 0.10);
  }

  get costTrendMaxCost(): number {
    return this.costTrendYMax;
  }

  get costTrendYLabels(): string[] {
    const yMin = this.costTrendYMin;
    const yMax = this.costTrendYMax;
    const range = yMax - yMin || 1;
    const steps = 5;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = yMax - (range / steps) * i;
      return '₹' + Math.round(val).toLocaleString();
    });
  }

  get costTrendPolyline(): string {
    const pts = this.costTrendPoints;
    if (!pts.length) return '';
    const W = 560; const H = 200; const LEFT = 60; const TOP = 20;
    const yMin = this.costTrendYMin;
    const range = (this.costTrendYMax - yMin) || 1;
    return pts.map((p, i) => {
      const x = LEFT + (i / Math.max(pts.length - 1, 1)) * W;
      const y = TOP + H - ((p.cost - yMin) / range) * H;
      return `${x},${y}`;
    }).join(' ');
  }

  get costTrendCircles(): { x: number; y: number; date: string; cost: number }[] {
    const pts = this.costTrendPoints;
    if (!pts.length) return [];
    const W = 560; const H = 200; const LEFT = 60; const TOP = 20;
    const yMin = this.costTrendYMin;
    const range = (this.costTrendYMax - yMin) || 1;
    return pts.map((p, i) => ({
      x: LEFT + (i / Math.max(pts.length - 1, 1)) * W,
      y: TOP + H - ((p.cost - yMin) / range) * H,
      date: p.date,
      cost: p.cost
    }));
  }

  // ── Pie charts ──────────────────────────────────────────────────────────

  readonly PIE_COLORS = [
    '#2563eb', '#7c3aed', '#db2777', '#16a34a', '#ea580c',
    '#d97706', '#0891b2', '#9333ea', '#dc2626', '#65a30d',
    '#0284c7', '#c026d3', '#f59e0b', '#4f46e5', '#e11d48',
  ];

  // Hover state
  hoveredTopResource: any = null;
  hoveredServiceCost: any = null;

  private buildPieSlices(rows: any[]): any[] {
    if (!rows?.length) return [];
    const filtered = rows.filter((r: any) => (r[0] || 0) > 0);
    if (!filtered.length) return [];
    const total = filtered.reduce((s: number, r: any) => s + (r[0] || 0), 0);
    if (!total) return [];

    const cx = 150, cy = 150, radius = 120;
    let angle = -Math.PI / 2; // start at 12 o'clock

    return filtered.map((row: any, i: number) => {
      const cost = row[0] || 0;
      const pct = cost / total;
      const sweep = pct * 2 * Math.PI;
      const end = angle + sweep;

      const x1 = cx + radius * Math.cos(angle);
      const y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(end);
      const y2 = cy + radius * Math.sin(end);

      // Label midpoint
      const midAngle = angle + sweep / 2;
      const lx = cx + (radius * 0.65) * Math.cos(midAngle);
      const ly = cy + (radius * 0.65) * Math.sin(midAngle);

      let path: string;

      if (pct >= 1) {
        // 100% slice: SVG arc can't draw a full circle in one command
        // (start === end point). Split into two 180° arcs instead.
        const xMid = cx + radius * Math.cos(angle + Math.PI);
        const yMid = cy + radius * Math.sin(angle + Math.PI);
        path = [
          `M ${cx} ${cy}`,
          `L ${x1.toFixed(2)} ${y1.toFixed(2)}`,
          `A ${radius} ${radius} 0 1 1 ${xMid.toFixed(2)} ${yMid.toFixed(2)}`,
          `A ${radius} ${radius} 0 1 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
          `Z`
        ].join(' ');
      } else {
        const largeArc = pct > 0.5 ? 1 : 0;
        path = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
      }

      angle = end;
      return {
        name: row[1] || 'Unknown',
        cost,
        color: this.PIE_COLORS[i % this.PIE_COLORS.length],
        path,
        percentage: Math.round(pct * 100),
        lx: lx.toFixed(1),
        ly: ly.toFixed(1),
      };
    });
  }

  get topResourcesPieSlices(): any[] {
    return this.buildPieSlices(this.topResources);
  }

  get serviceCostsPieSlices(): any[] {
    const sorted = [...this.serviceCosts].sort((a, b) => (b[0] || 0) - (a[0] || 0));
    return this.buildPieSlices(sorted);
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
    this.repoBranchesCount = null;
    this.dashboardService.selectedPage = 'project-detail';
  }

  goBackToProjects() {
    this.selectedProject = null;
    this.selectedProjectRepos = [];
    this.selectedRepoForDetails = null;
    this.activeRepoDetailsTab = '';
    this.repoBranchesCount = null;
    this.dashboardService.selectedPage = 'projects';
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
    // Reset filters on project change
    this.boardFilterSprint = '';
    this.boardFilterType = '';
    this.boardFilterState = '';
    this.boardFilterAssigned = '';
    this.collapsedSprints = new Set();

    if (!projName) {
      this.workItems = [];
      this.workItemSprints = [];
      return;
    }
    this.loadWorkItems(projName);
  }

  // ── Board computed helpers ────────────────────────────────────────────────

  get filteredWorkItems(): any[] {
    return this.workItems.filter(item => {
      if (this.boardFilterSprint && item.sprint !== this.boardFilterSprint) return false;
      if (this.boardFilterType && item.type !== this.boardFilterType) return false;
      if (this.boardFilterState && item.state !== this.boardFilterState) return false;
      if (this.boardFilterAssigned && (item.assignedTo || 'Unassigned') !== this.boardFilterAssigned) return false;
      return true;
    });
  }

  get groupedWorkItems(): { sprint: string; items: any[] }[] {
    const items = this.filteredWorkItems;
    const map = new Map<string, any[]>();
    for (const item of items) {
      const sprint = item.sprint || 'No Sprint';
      if (!map.has(sprint)) map.set(sprint, []);
      map.get(sprint)!.push(item);
    }
    return Array.from(map.entries()).map(([sprint, items]) => ({ sprint, items }));
  }

  get boardUniqueTypes(): string[] {
    return [...new Set(this.workItems.map(i => i.type).filter(Boolean))];
  }

  get boardUniqueStates(): string[] {
    return [...new Set(this.workItems.map(i => i.state).filter(Boolean))];
  }

  get boardUniqueAssignees(): string[] {
    return [...new Set(this.workItems.map(i => i.assignedTo || 'Unassigned'))];
  }

  toggleSprintCollapse(sprint: string) {
    if (this.collapsedSprints.has(sprint)) {
      this.collapsedSprints.delete(sprint);
    } else {
      this.collapsedSprints.add(sprint);
    }
  }

  isSprintCollapsed(sprint: string): boolean {
    return this.collapsedSprints.has(sprint);
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
      this.costTrendPoints = [];
      return;
    }
    this.loadSubscriptionMetrics(subId);
    this.loadDailyCostRange();
  }

  onAzureProjectChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const proj = select.value;
    this.selectedAzureProject = proj;
    this.selectedSubscriptionId = '';
    this.subscriptions = [];
    this.totalCost = 0;
    this.budgets = [];
    this.topResources = [];
    this.serviceCosts = [];
    this.costTrendPoints = [];
    this.yearlyCost = 0;

    if (!proj) {
      return;
    }
    this.loadSubscriptions();
    this.loadTrendData();
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
        this.scrollToRepoDetails();
      },
      error: (err) => {
        console.warn('Failed to load commits', err);
        this.repoCommits = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch commits.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
        this.scrollToRepoDetails();
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
        this.scrollToRepoDetails();
      },
      error: (err) => {
        console.warn('Failed to load pull requests', err);
        this.repoPRs = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch pull requests.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
        this.scrollToRepoDetails();
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
          this.repoBranchesCount = res.count ?? res.branches.length;
        } else {
          this.repoBranches = [];
          this.repoBranchesCount = null;
          this.repoDetailsError = 'No branches found or failed to parse response.';
        }
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
        this.scrollToRepoDetails();
      },
      error: (err) => {
        console.warn('Failed to load branches', err);
        this.repoBranches = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch branches.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
        this.scrollToRepoDetails();
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
        this.scrollToRepoDetails();
      },
      error: (err) => {
        console.warn('Failed to load pushes', err);
        this.repoPushes = [];
        this.repoDetailsError = err.error?.detail || err.error?.message || err.message || 'Failed to fetch pushes.';
        this.isLoadingRepoDetails = false;
        this.cdr.detectChanges();
        this.scrollToRepoDetails();
      }
    });
  }

  private scrollToRepoDetails() {
    setTimeout(() => {
      this.repoDetailsAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }
}