import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FrontendCacheService } from '../frontend-cache.service';

@Injectable({
  providedIn: 'root'
})
export class PipelinesApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/projects';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) {}

  getPipelines(projectName: string): Observable<any> {
    const cacheKey = `pipelines:project:${projectName}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}/${projectName}/pipelines`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getActivePipelinesCount(): Observable<any> {
    const cacheKey = 'pipelines:activecount';
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`http://127.0.0.1:8000/api/pipelines/active-count`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }
}