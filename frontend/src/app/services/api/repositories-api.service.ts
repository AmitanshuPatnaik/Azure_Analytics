import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RepositoriesApiService {
  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  getAllRepositories(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/repos`);
  }

  getRepositoriesByProject(projectName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos`);
  }

  getFiles(projectName: string, repoName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/files`);
  }

  getCommits(projectName: string, repoName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/commits`);
  }

  getPushes(projectName: string, repoName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/pushes`);
  }

  getBranches(projectName: string, repoName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/branches`);
  }

  getTags(projectName: string, repoName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/tags`);
  }

  getPullRequests(projectName: string, repoName: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/projects/${projectName}/repos/${repoName}/pullrequests`);
  }
}