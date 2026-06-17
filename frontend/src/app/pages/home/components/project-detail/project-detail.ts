import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../../services/dashboard.service';
import { RepositoriesApiService } from '../../../../services/api/repositories-api.service';

@Component({
  selector: 'app-project-detail',
  imports: [CommonModule],
  templateUrl: './project-detail.html',
  styleUrl: '../../home.css'
})
export class ProjectDetailComponent implements OnInit {

  selectedProjectRepos: any[] = [];
  selectedRepoForDetails: any = null;
  activeRepoDetailsTab = '';
  repoCommits: any[] = [];
  repoPRs: any[] = [];
  repoBranches: any[] = [];
  repoBranchesCount: number | null = null;
  repoPushes: any[] = [];
  
  isLoadingRepoDetails = false;
  reposError: string | null = null;
  repoDetailsError: string | null = null;

  pageSize = 10;
  get Math() { return Math; }

  reposCurrentPage = 1;
  commitsCurrentPage = 1;
  prsCurrentPage = 1;
  branchesCurrentPage = 1;
  pushesCurrentPage = 1;

  get paginatedRepos(): any[] {
    const start = (this.reposCurrentPage - 1) * this.pageSize;
    return this.selectedProjectRepos.slice(start, start + this.pageSize);
  }
  get reposTotalPages(): number {
    return Math.ceil(this.selectedProjectRepos.length / this.pageSize);
  }

  get paginatedCommits(): any[] {
    const start = (this.commitsCurrentPage - 1) * this.pageSize;
    return this.repoCommits.slice(start, start + this.pageSize);
  }
  get commitsTotalPages(): number {
    return Math.ceil(this.repoCommits.length / this.pageSize);
  }

  get paginatedPRs(): any[] {
    const start = (this.prsCurrentPage - 1) * this.pageSize;
    return this.repoPRs.slice(start, start + this.pageSize);
  }
  get prsTotalPages(): number {
    return Math.ceil(this.repoPRs.length / this.pageSize);
  }

  get paginatedBranches(): any[] {
    const start = (this.branchesCurrentPage - 1) * this.pageSize;
    return this.repoBranches.slice(start, start + this.pageSize);
  }
  get branchesTotalPages(): number {
    return Math.ceil(this.repoBranches.length / this.pageSize);
  }

  get paginatedPushes(): any[] {
    const start = (this.pushesCurrentPage - 1) * this.pageSize;
    return this.repoPushes.slice(start, start + this.pageSize);
  }
  get pushesTotalPages(): number {
    return Math.ceil(this.repoPushes.length / this.pageSize);
  }

  @ViewChild('repoDetailsAnchor') repoDetailsAnchor!: ElementRef;

  constructor(
    public dashboardService: DashboardService,
    private reposApi: RepositoriesApiService,
    private cdr: ChangeDetectorRef
  ) {}

  get selectedProject() {
    return this.dashboardService.selectedProject;
  }

  ngOnInit() {
    if (this.selectedProject) {
      this.loadProjectRepos(this.selectedProject.name);
    }
  }

  loadProjectRepos(projectName: string) {
    this.reposCurrentPage = 1;
    this.reposError = null;
    this.reposApi.getRepositoriesByProject(projectName).subscribe({
      next: (res: any) => {
        if (res && res.success && res.repositories) {
          this.selectedProjectRepos = res.repositories;
        } else if (res && res.repositories) {
          this.selectedProjectRepos = res.repositories;
        } else {
          this.selectedProjectRepos = [];
          this.reposError = 'No repositories found in this project.';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to load project repositories', err);
        this.selectedProjectRepos = [];
        this.reposError = err.error?.detail || err.error?.message || err.message || 'Failed to load repositories.';
        this.cdr.detectChanges();
      }
    });
  }

  goBackToProjects() {
    this.dashboardService.selectedProject = null;
    this.dashboardService.selectedRepoForDetails = null;
    this.dashboardService.selectedPage = 'projects';
  }

  viewRepoCommits(repo: any) {
    this.selectedRepoForDetails = repo;
    this.activeRepoDetailsTab = 'commits';
    this.commitsCurrentPage = 1;
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
    this.prsCurrentPage = 1;
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
    this.branchesCurrentPage = 1;
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
    this.pushesCurrentPage = 1;
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
