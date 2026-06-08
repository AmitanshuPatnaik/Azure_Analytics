import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AzureApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/azure';

  constructor(private http: HttpClient) {}

  getSubscriptions(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/subscriptions`);
  }

  getTotalCost(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/total`);
  }

  getDailyCosts(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/daily`);
  }

  getMonthlyCosts(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/monthly`);
  }

  getYearlyCosts(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/yearly`);
  }

  getResourceGroupCosts(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/resourcegroups`);
  }

  getServiceCosts(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/services`);
  }

  getResourceCosts(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/resources`);
  }

  getTopResources(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/top-resources`);
  }

  getBudgets(subscriptionId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/costs/${subscriptionId}/budgets`);
  }
}