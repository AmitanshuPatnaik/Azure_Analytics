import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FrontendCacheService } from '../frontend-cache.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectsApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/projects';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) {}

  getProjects(): Observable<any> {
    const cacheKey = 'projects:all';
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    return this.http.get<any>(`${this.baseUrl}`).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }
}