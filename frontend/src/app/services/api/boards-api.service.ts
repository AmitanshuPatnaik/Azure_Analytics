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

  getWorkItems(projectName: string): Observable<any> {
    const cacheKey = `boards:workitems:${projectName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/${projectName}/workitems`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getRecentChanges(projectName: string, days = 30, limit = 25): Observable<any> {
    const cacheKey = `boards:recent-changes:${projectName}:${days}:${limit}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(
      `${this.boardsUrl}/${projectName}/recent-changes?days=${days}&limit=${limit}`
    ).pipe(
      tap(data => this.cache.set(cacheKey, data, 3 * 60 * 1000)) // 3-min TTL for activity feed
    );
  }
}