import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FrontendCacheService } from '../frontend-cache.service';

@Injectable({
  providedIn: 'root'
})
export class TestPlansApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/projects';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) {}

  getTestPlans(projectName: string, page: number = 1, pageSize: number = 10, search?: string): Observable<any> {
    const cacheKey = `testplans:all:${projectName}:page:${page}:${pageSize}:search:${search || ''}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    let url = `${this.baseUrl}/${projectName}/testplans?page=${page}&page_size=${pageSize}`;
    if (search) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    return this.http.get<any>(url).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }
}