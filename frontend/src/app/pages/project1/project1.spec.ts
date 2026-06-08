import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Project1 } from './project1';

describe('Project1', () => {
  let component: Project1;
  let fixture: ComponentFixture<Project1>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Project1],
    }).compileComponents();

    fixture = TestBed.createComponent(Project1);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
