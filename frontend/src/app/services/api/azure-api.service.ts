import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AzureApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/azure';

  constructor(private http: HttpClient) { }

  private getUrl(path: string, project?: string): string {
    if (project) {
      const sep = path.includes('?') ? '&' : '?';
      return `${this.baseUrl}/${path}${sep}project=${project}`;
    }
    return `${this.baseUrl}/${path}`;
  }

  getSubscriptions(project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl('subscriptions', project));
  }

  getTotalCost(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/total`, project));
  }

  getDailyCosts(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/daily`, project));
  }

  getDailyCostsByRange(subscriptionId: string, fromDate: string, toDate: string, project?: string): Observable<any> {
    return this.http.get<any>(
      this.getUrl(`costs/${subscriptionId}/daily-range?from_date=${fromDate}&to_date=${toDate}`, project)
    );
  }

  getMonthlyCosts(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/monthly`, project));
  }

  getYearlyCosts(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/yearly`, project));
  }

  getResourceGroupCosts(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/resourcegroups`, project));
  }

  getServiceCosts(subscriptionId: string, fromDate: string, toDate: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/services?from_date=${fromDate}&to_date=${toDate}`, project));
  }

  getResourceCosts(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/resources`, project));
  }

  getTopResources(subscriptionId: string, fromDate: string, toDate: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/top-resources?from_date=${fromDate}&to_date=${toDate}`, project));
  }

  getBudgets(subscriptionId: string, project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl(`costs/${subscriptionId}/budgets`, project));
  }

  getCostTrend(project?: string): Observable<any> {
    return this.http.get<any>(this.getUrl('costs/trend', project));
  }

  getAzureProjects(): Observable<any> {
    return this.http.get<any>(this.getUrl('projects'));
  }
}