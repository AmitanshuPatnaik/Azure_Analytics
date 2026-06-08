import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StatusApiService {
  private baseUrl = 'http://127.0.0.1:8000/api/status';

  constructor(private http: HttpClient) {}

  getServicesStatus(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/services`);
  }
}
