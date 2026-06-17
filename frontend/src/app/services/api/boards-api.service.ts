import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FrontendCacheService } from '../frontend-cache.service';

@Injectable({
  providedIn: 'root'
})
export class BoardsApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/projects';
  private boardsUrl = 'http://127.0.0.1:8000/api/boards';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) {}

  getWorkItems(projectName: string, page: number = 1, pageSize: number = 10, sprint?: string, type?: string, state?: string, assigned?: string): Observable<any> {
    const cacheKey = `boards:workitems:${projectName}:page:${page}:${pageSize}:sprint:${sprint || ''}:type:${type || ''}:state:${state || ''}:assigned:${assigned || ''}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    let url = `${this.baseUrl}/${projectName}/workitems?page=${page}&page_size=${pageSize}`;
    if (sprint) url += `&sprint=${encodeURIComponent(sprint)}`;
    if (type) url += `&type=${encodeURIComponent(type)}`;
    if (state) url += `&state=${encodeURIComponent(state)}`;
    if (assigned) url += `&assigned=${encodeURIComponent(assigned)}`;
    return this.http.get<any>(url).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getRecentChanges(projectName: string, days = 30, limit = 25, page = 1, pageSize = 10): Observable<any> {
    const cacheKey = `boards:recent-changes:${projectName}:${days}:${limit}:page:${page}:${pageSize}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(
      `${this.boardsUrl}/${projectName}/recent-changes?days=${days}&limit=${limit}&page=${page}&page_size=${pageSize}`
    ).pipe(
      tap(data => this.cache.set(cacheKey, data, 3 * 60 * 1000)) // 3-min TTL for activity feed
    );
  }
}