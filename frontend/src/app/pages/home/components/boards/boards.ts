import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../../../../services/dashboard.service';
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { BoardsApiService } from '../../../../services/api/boards-api.service';

@Component({
  selector: 'app-boards',
  imports: [CommonModule, FormsModule],
  templateUrl: './boards.html',
  styleUrl: '../../home.css'
})
export class BoardsComponent implements OnInit {

  projects: any[] = [];
  workItems: any[] = [];
  workItemSprints: string[] = [];
  isLoadingWorkItems = false;
  workItemsError: string | null = null;

  // Recent state-change activity feed
  recentChanges: any[] = [];
  isLoadingChanges = false;
  changesError: string | null = null;

  sprintPages = new Map<string, number>();
  changesCurrentPage = 1;
  projectsCurrentPage = 1;
  get Math() { return Math; }

  get paginatedProjects(): any[] {
    const start = (this.projectsCurrentPage - 1) * 10;
    return this.projects.slice(start, start + 10);
  }

  get projectsTotalPages(): number {
    return Math.ceil(this.projects.length / 10);
  }

  getSprintPage(sprintName: string): number {
    return this.sprintPages.get(sprintName) || 1;
  }

  setSprintPage(sprintName: string, page: number) {
    this.sprintPages.set(sprintName, page);
  }

  getPaginatedSprintItems(sprintName: string, items: any[]): any[] {
    const page = this.getSprintPage(sprintName);
    const start = (page - 1) * 10;
    return items.slice(start, start + 10);
  }

  getSprintTotalPages(items: any[]): number {
    return Math.ceil(items.length / 10);
  }

  get paginatedRecentChanges(): any[] {
    const start = (this.changesCurrentPage - 1) * 10;
    return this.recentChanges.slice(start, start + 10);
  }

  get changesTotalPages(): number {
    return Math.ceil(this.recentChanges.length / 10);
  }

  boardFilterSprint = '';
  boardFilterType = '';
  boardFilterState = '';
  boardFilterAssigned = '';
  collapsedSprints: Set<string> = new Set();

  constructor(
    public dashboardService: DashboardService,
    private projectsApi: ProjectsApiService,
    private boardsApi: BoardsApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProjects();
    if (this.dashboardService.selectedProject) {
      this.loadWorkItems(this.dashboardService.selectedProject.name);
      this.loadRecentChanges(this.dashboardService.selectedProject.name);
    }
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

  loadWorkItems(projName: string) {
    this.isLoadingWorkItems = true;
    this.workItemsError = null;
    this.boardsApi.getWorkItems(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.workItems = (res.value || []).map((item: any) => {
            const f = item.fields || {};
            const assignedTo = f['System.AssignedTo'];
            return {
              id: item.id,
              rev: item.rev,
              title: f['System.Title'],
              type: f['System.WorkItemType'],
              state: f['System.State'],
              boardColumn: f['System.BoardColumn'],
              assignedTo: assignedTo?.displayName || null,
              priority: f['Microsoft.VSTS.Common.Priority'],
              severity: f['Microsoft.VSTS.Common.Severity'] || null,
              stateChangedDate: f['Microsoft.VSTS.Common.StateChangeDate'] || null,
              startDate: f['Microsoft.VSTS.Scheduling.StartDate'] || null,
              targetDate: f['Microsoft.VSTS.Scheduling.TargetDate'] || null,
              sprint: f['_sprint'] || 'No Sprint',
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

  loadRecentChanges(projName: string) {
    this.isLoadingChanges = true;
    this.changesError = null;
    this.boardsApi.getRecentChanges(projName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          this.recentChanges = res.changes || [];
        } else {
          this.recentChanges = [];
          this.changesError = res?.message || 'Could not load recent changes.';
        }
        this.isLoadingChanges = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(`Could not load recent changes for project ${projName}`, err);
        this.recentChanges = [];
        this.changesError = err.error?.detail || err.message || 'Failed to load recent changes.';
        this.isLoadingChanges = false;
        this.cdr.detectChanges();
      }
    });
  }

  selectProject(project: any) {
    this.sprintPages.clear();
    this.changesCurrentPage = 1;
    this.projectsCurrentPage = 1;
    this.dashboardService.selectedProject = project;
    this.loadWorkItems(project.name);
    this.loadRecentChanges(project.name);
  }

  changeProject() {
    this.sprintPages.clear();
    this.changesCurrentPage = 1;
    this.projectsCurrentPage = 1;
    this.dashboardService.selectedProject = null;
    this.workItems = [];
    this.workItemSprints = [];
    this.recentChanges = [];
    this.workItemsError = null;
    this.changesError = null;
  }

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

  /** Format an ISO timestamp to a human-friendly local date-time string. */
  formatChangedAt(iso: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  /** State → badge colour map. */
  stateColor(state: string | null): { bg: string; fg: string } {
    if (!state) return { bg: '#f1f5f9', fg: '#475569' };
    const s = state.toLowerCase();
    if (s === 'done' || s === 'closed' || s === 'resolved') return { bg: '#dcfce7', fg: '#15803d' };
    if (s === 'active' || s === 'in progress' || s === 'committed') return { bg: '#dbeafe', fg: '#1d4ed8' };
    if (s === 'new' || s === 'proposed') return { bg: '#fef9c3', fg: '#854d0e' };
    if (s === 'removed' || s === 'cancelled') return { bg: '#fee2e2', fg: '#b91c1c' };
    return { bg: '#f1f5f9', fg: '#475569' };
  }
}
