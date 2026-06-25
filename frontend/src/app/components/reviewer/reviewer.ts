import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectsApiService } from '../../services/api/projects-api.service';
import { RepositoriesApiService } from '../../services/api/repositories-api.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-reviewer',
  imports: [CommonModule, FormsModule],
  templateUrl: './reviewer.html',
  styleUrl: './reviewer.css'
})
export class ReviewerComponent implements OnInit {

  // ── Dropdowns ───────────────────────────────────────────────────────
  projects: any[] = [];
  repos: any[] = [];
  pullRequests: any[] = [];

  selectedProject: any = null;
  selectedRepo: any = null;
  selectedPR: any = null;

  // ── Loading states ──────────────────────────────────────────────────
  isLoadingProjects = false;
  isLoadingRepos = false;
  isLoadingPRs = false;

  // ── Error states ────────────────────────────────────────────────────
  projectsError: string | null = null;
  reposError: string | null = null;
  prsError: string | null = null;

  // ── Review action state ──────────────────────────────────────────────
  reviewTriggered = false;
  isLoadingReview = false;
  diffFiles: any[] = [];
  aiReviewContent = '';

  // ── Derived info card values ─────────────────────────────────────────
  get sourceTarget(): string {
    if (!this.selectedPR) return '';
    const src = this.selectedPR.sourceRefName?.replace('refs/heads/', '') ?? '';
    const tgt = this.selectedPR.targetRefName?.replace('refs/heads/', '') ?? '';
    return src && tgt ? `${src} → ${tgt}` : '';
  }

  get lastUpdated(): string {
    if (!this.selectedPR) return '';
    const raw = this.selectedPR.closedDate
      ?? this.selectedPR.completionQueueTime
      ?? this.selectedPR.creationDate
      ?? '';
    if (!raw) return '';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toLocaleString('en-GB', { hour12: false });
  }

  constructor(
    private projectsApi: ProjectsApiService,
    private reposApi: RepositoriesApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  // ── Load projects ────────────────────────────────────────────────────
  loadProjects(): void {
    this.isLoadingProjects = true;
    this.projectsError = null;
    this.projectsApi.getProjects(1, 100).subscribe({
      next: (res: any) => {
        this.projects = res?.projects ?? [];
        this.isLoadingProjects = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.projectsError = err?.error?.message ?? 'Failed to load projects.';
        this.isLoadingProjects = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Select project → load repos ──────────────────────────────────────
  onProjectChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    this.selectedProject = this.projects.find(p => p.name === name) ?? null;
    this.selectedRepo = null;
    this.selectedPR = null;
    this.repos = [];
    this.pullRequests = [];
    this.reviewTriggered = false;
    this.diffFiles = [];
    this.aiReviewContent = '';

    if (!this.selectedProject) return;

    this.isLoadingRepos = true;
    this.reposError = null;
    this.reposApi.getRepositoriesByProject(name, 1, 200).subscribe({
      next: (res: any) => {
        this.repos = res?.repositories ?? [];
        this.isLoadingRepos = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.reposError = err?.error?.message ?? 'Failed to load repositories.';
        this.isLoadingRepos = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Select repo → load PRs ───────────────────────────────────────────
  onRepoChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    this.selectedRepo = this.repos.find(r => r.name === name) ?? null;
    this.selectedPR = null;
    this.pullRequests = [];
    this.reviewTriggered = false;
    this.diffFiles = [];
    this.aiReviewContent = '';

    if (!this.selectedRepo || !this.selectedProject) return;

    this.isLoadingPRs = true;
    this.prsError = null;
    this.reposApi.getPullRequests(this.selectedProject.name, name, 1, 200).subscribe({
      next: (res: any) => {
        this.pullRequests = res?.pull_requests ?? res?.pullRequests ?? [];
        this.isLoadingPRs = false;
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.prsError = err?.error?.message ?? 'Failed to load pull requests.';
        this.isLoadingPRs = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Select PR ────────────────────────────────────────────────────────
  onPRChange(event: Event): void {
    const idStr = (event.target as HTMLSelectElement).value;
    this.selectedPR = this.pullRequests.find(
      p => String(p.pullRequestId ?? p.id) === idStr
    ) ?? null;
    // Reset review state whenever PR changes
    this.reviewTriggered = false;
    this.diffFiles = [];
    this.aiReviewContent = '';
    this.cdr.detectChanges();
  }

  // ── Get Review ───────────────────────────────────────────────────────
  getReview(): void {
    if (!this.selectedPR || !this.selectedRepo || !this.selectedProject) return;
    const repoId = this.selectedRepo.id;
    const prId = this.selectedPR.pullRequestId ?? this.selectedPR.id;
    const projectName = this.selectedProject.name;

    this.isLoadingReview = true;
    this.reviewTriggered = false;
    this.diffFiles = [];
    this.aiReviewContent = '';
    this.reposError = null;
    this.prsError = null;
    this.cdr.detectChanges();

    forkJoin({
      deltas: this.reposApi.getPRDeltas(repoId, prId, projectName).pipe(catchError(() => of({ success: false, message: 'Failed to fetch diffs.' }))),
      review: this.reposApi.getPRReview(repoId, prId, projectName).pipe(catchError(() => of({ success: false, message: 'Failed to fetch AI review.' })))
    }).subscribe({
      next: (res: any) => {
        if (res.deltas && res.deltas.success) {
          this.diffFiles = res.deltas.files || [];
        } else {
          this.reposError = res.deltas?.message || 'Failed to load code diffs.';
        }

        if (res.review && res.review.success) {
          this.aiReviewContent = res.review.review || '';
          this.reviewTriggered = true;
        } else {
          this.prsError = res.review?.message || 'Failed to generate AI review.';
        }

        this.isLoadingReview = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error fetching review or deltas', err);
        this.isLoadingReview = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Post Review ──────────────────────────────────────────────────────
  postReview(): void {
    if (!this.selectedPR || !this.selectedRepo || !this.selectedProject || !this.aiReviewContent) return;
    const repoId = this.selectedRepo.id;
    const prId = this.selectedPR.pullRequestId ?? this.selectedPR.id;
    const projectName = this.selectedProject.name;

    this.isLoadingReview = true;
    this.reposApi.postPRReview(repoId, prId, this.aiReviewContent, projectName).subscribe({
      next: (res: any) => {
        if (res && res.success) {
          alert('Review posted successfully to Azure DevOps!');
        } else {
          alert('Failed to post review: ' + (res?.message || 'Unknown error'));
        }
        this.isLoadingReview = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Failed to post review', err);
        alert('Failed to post review: ' + (err.error?.message || err.message));
        this.isLoadingReview = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Copy AI output ───────────────────────────────────────────────────
  copyOutput(): void {
    const el = document.getElementById('rv-eval-content');
    if (el) {
      navigator.clipboard.writeText(el.innerText).catch(() => {});
    }
  }
}