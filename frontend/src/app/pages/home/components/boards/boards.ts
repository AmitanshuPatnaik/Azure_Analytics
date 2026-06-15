import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../services/dashboard.service';
import { ProjectsApiService } from '../../../../services/api/projects-api.service';
import { BoardsApiService } from '../../../../services/api/boards-api.service';

@Component({
  selector: 'app-boards',
  imports: [CommonModule],
  templateUrl: './boards.html',
  styleUrl: '../../home.css'
})
export class BoardsComponent implements OnInit {

  projects: any[] = [];
  workItems: any[] = [];
  workItemSprints: string[] = [];
  isLoadingWorkItems = false;
  workItemsError: string | null = null;

  selectedBoardProject = '';
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
        if (this.projects.length > 0 && !this.selectedBoardProject) {
          this.selectedBoardProject = this.projects[0].name;
          this.loadWorkItems(this.selectedBoardProject);
        }
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
}
