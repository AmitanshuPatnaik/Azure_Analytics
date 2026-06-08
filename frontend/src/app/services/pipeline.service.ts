import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PipelineService {

  private apiUrl = 'http://localhost:8000/pipelines';

  constructor(private http: HttpClient) {}

  getPipelines() {
    return this.http.get(this.apiUrl);
  }
}