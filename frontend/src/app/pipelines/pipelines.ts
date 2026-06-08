import { Component, OnInit } from '@angular/core';
import { PipelineService } from '../services/pipeline.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pipelines',
  imports: [CommonModule],   // ✅ REQUIRED FIX
  templateUrl: './pipelines.html',
  styleUrl: './pipelines.css'
})
export class Pipelines implements OnInit {

  pipelines: any[] = [];
  loading = true;

  constructor(private pipelineService: PipelineService) {}

  ngOnInit() {
    this.pipelineService.getPipelines().subscribe((res: any) => {
      this.pipelines = res.pipelines;
      this.loading = false;
    });
  }
}