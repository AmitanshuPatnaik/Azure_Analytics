import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FrontendCacheService } from '../frontend-cache.service';

@Injectable({
  providedIn: 'root'
})
export class StatusApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/status';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) {}

  getServicesStatus(project?: string): Observable<any> {
    const cacheKey = `status:services:${project || ''}`;
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }
    const url = project
      ? `${this.baseUrl}/services?project=${encodeURIComponent(project)}`
      : `${this.baseUrl}/services`;
    return this.http.get<any>(url).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }
}
