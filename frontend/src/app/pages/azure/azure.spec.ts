import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Azure } from './azure';

describe('Azure', () => {
  let component: Azure;
  let fixture: ComponentFixture<Azure>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Azure],
    }).compileComponents();

    fixture = TestBed.createComponent(Azure);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
