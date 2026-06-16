import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { normalizeUtcDate } from '../../utils/utc-date.util';
import { FrontendCacheService } from '../frontend-cache.service';
import {
  AzureBudgetsResponse,
  AzureDailyRangeResponse,
  AzureServiceCostsResponse,
  AzureTopResourcesResponse,
  AzureTotalCostResponse,
} from '../../models/azure-cost.models';

@Injectable({
  providedIn: 'root'
})
export class AzureApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/azure';

  constructor(
    private http: HttpClient,
    private cache: FrontendCacheService
  ) { }

  private getUrl(path: string, project?: string): string {
    if (project) {
      const sep = path.includes('?') ? '&' : '?';
      return `${this.baseUrl}/${path}${sep}project=${encodeURIComponent(project)}`;
    }
    return `${this.baseUrl}/${path}`;
  }

  /** Build a dated query string using normalized UTC YYYY-MM-DD values. */
  private datedQuery(fromDate: string, toDate: string): string {
    const from = normalizeUtcDate(fromDate);
    const to = normalizeUtcDate(toDate);
    return `from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`;
  }

  getSubscriptions(project?: string): Observable<any> {
    const cacheKey = `azure:subscriptions:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl('subscriptions', project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getTotalCost(subscriptionId: string, project?: string): Observable<AzureTotalCostResponse> {
    const cacheKey = `azure:totalcost:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<AzureTotalCostResponse>(
      this.getUrl(`costs/${subscriptionId}/total`, project)
    ).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getDailyCosts(subscriptionId: string, project?: string): Observable<any> {
    const cacheKey = `azure:dailycosts:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/daily`, project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getDailyCostsByRange(
    subscriptionId: string,
    fromDate: string,
    toDate: string,
    project?: string
  ): Observable<AzureDailyRangeResponse> {
    const from = normalizeUtcDate(fromDate);
    const to = normalizeUtcDate(toDate);
    const cacheKey = `azure:dailycostsbyrange:${subscriptionId}:${from}:${to}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    const qs = this.datedQuery(fromDate, toDate);
    return this.http.get<AzureDailyRangeResponse>(
      this.getUrl(`costs/${subscriptionId}/daily-range?${qs}`, project)
    ).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getMonthlyCosts(subscriptionId: string, project?: string): Observable<any> {
    const cacheKey = `azure:monthlycosts:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/monthly`, project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getYearlyCosts(subscriptionId: string, project?: string): Observable<any> {
    const cacheKey = `azure:yearlycosts:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/yearly`, project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getResourceGroupCosts(subscriptionId: string, project?: string): Observable<any> {
    const cacheKey = `azure:resourcegroupcosts:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/resourcegroups`, project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getServiceCosts(
    subscriptionId: string,
    fromDate: string,
    toDate: string,
    project?: string
  ): Observable<AzureServiceCostsResponse> {
    const from = normalizeUtcDate(fromDate);
    const to = normalizeUtcDate(toDate);
    const cacheKey = `azure:servicecosts:${subscriptionId}:${from}:${to}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    const qs = this.datedQuery(fromDate, toDate);
    return this.http.get<AzureServiceCostsResponse>(
      this.getUrl(`costs/${subscriptionId}/services?${qs}`, project)
    ).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getResourceCosts(subscriptionId: string, project?: string): Observable<any> {
    const cacheKey = `azure:resourcecosts:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/resources`, project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getTopResources(
    subscriptionId: string,
    fromDate: string,
    toDate: string,
    project?: string
  ): Observable<AzureTopResourcesResponse> {
    const from = normalizeUtcDate(fromDate);
    const to = normalizeUtcDate(toDate);
    const cacheKey = `azure:topresources:${subscriptionId}:${from}:${to}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    const qs = this.datedQuery(fromDate, toDate);
    return this.http.get<AzureTopResourcesResponse>(
      this.getUrl(`costs/${subscriptionId}/top-resources?${qs}`, project)
    ).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getBudgets(subscriptionId: string, project?: string): Observable<AzureBudgetsResponse> {
    const cacheKey = `azure:budgets:${subscriptionId}:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<AzureBudgetsResponse>(
      this.getUrl(`costs/${subscriptionId}/budgets`, project)
    ).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getCostTrend(project?: string): Observable<any> {
    const cacheKey = `azure:costtrend:${project || ''}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl('costs/trend', project)).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getAzureProjects(): Observable<any> {
    const cacheKey = `azure:projects`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl('projects')).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }

  getCombinedYearlyCost(): Observable<any> {
    const cacheKey = `azure:combinedyearlycost`;
    const cached = this.cache.get(cacheKey);
    if (cached) return of(cached);

    return this.http.get<any>(this.getUrl('costs/combined-yearly')).pipe(
      tap(data => this.cache.set(cacheKey, data))
    );
  }
}
