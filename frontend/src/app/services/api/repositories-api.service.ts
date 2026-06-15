import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FrontendCacheService } from '../frontend-cache.service';

@Injectable({
  providedIn: 'root'
})
export class RepositoriesApiService {
  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) {}

  getAllRepositories(): Observable<any> {
    const cacheKey = 'repos:all';
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/repos`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getRepositoriesByProject(projectName: string): Observable<any> {
    const cacheKey = `repos:project:${projectName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getFiles(projectName: string, repoName: string): Observable<any> {
    const cacheKey = `repos:files:${projectName}:${repoName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/files`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getCommits(projectName: string, repoName: string): Observable<any> {
    const cacheKey = `repos:commits:${projectName}:${repoName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/commits`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getPushes(projectName: string, repoName: string): Observable<any> {
    const cacheKey = `repos:pushes:${projectName}:${repoName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/pushes`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getBranches(projectName: string, repoName: string): Observable<any> {
    const cacheKey = `repos:branches:${projectName}:${repoName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/branches`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getTags(projectName: string, repoName: string): Observable<any> {
    const cacheKey = `repos:tags:${projectName}:${repoName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/tags`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getPullRequests(projectName: string, repoName: string): Observable<any> {
    const cacheKey = `repos:pullrequests:${projectName}:${repoName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/pullrequests`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }
}