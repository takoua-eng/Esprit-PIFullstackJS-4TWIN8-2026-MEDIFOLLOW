import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of } from 'rxjs';

import { StrokeRiskComponent } from './stroke-risk.component';
import { API_BASE_URL } from 'src/app/core/api.config';

describe('StrokeRiskComponent', () => {
  let component: StrokeRiskComponent;
  let fixture: ComponentFixture<StrokeRiskComponent>;
  let httpMock: HttpTestingController;

  const mockToken = {
    sub: 'doctor123',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrokeRiskComponent, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(StrokeRiskComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);

    // mock localStorage
    spyOn(localStorage, 'getItem').and.returnValue(
      btoa(JSON.stringify({ sub: 'doctor123' }))
    );

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─────────────────────────────
  // CREATE
  // ─────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────
  // LEVEL COLOR
  // ─────────────────────────────
  it('should return correct level color', () => {
    expect(component.levelColor('HIGH')).toBe('#d63031');
    expect(component.levelColor('MEDIUM')).toBe('#fdcb6e');
    expect(component.levelColor('LOW')).toBe('#00b894');
    expect(component.levelColor('UNKNOWN')).toBe('#b2bec3');
  });

  // ─────────────────────────────
  // LEVEL BACKGROUND
  // ─────────────────────────────
  it('should return correct level background', () => {
    expect(component.levelBg('HIGH')).toContain('#d63031');
    expect(component.levelBg('MEDIUM')).toContain('#fdcb6e');
    expect(component.levelBg('LOW')).toContain('#00b894');
  });

  // ─────────────────────────────
  // FILTERS
  // ─────────────────────────────
  it('should filter results by text and level', () => {
    component.results = [
      {
        patientId: '1',
        patientName: 'Ali Ben',
        prediction: {
          riskScore: 0.9,
          riskLevel: 'HIGH',
          riskColor: '',
          clusterLabel: '',
          recommendations: [],
        },
      },
      {
        patientId: '2',
        patientName: 'Sara Test',
        prediction: {
          riskScore: 0.3,
          riskLevel: 'LOW',
          riskColor: '',
          clusterLabel: '',
          recommendations: [],
        },
      },
    ] as any;

    component.searchText = 'ali';
    component.filterLevel = 'ALL';

    component.applyFilters();

    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].patientName).toBe('Ali Ben');
  });

  // ─────────────────────────────
  // COUNTERS
  // ─────────────────────────────
  it('should count risk levels correctly', () => {
    component.results = [
      { patientId: '1', patientName: 'A', prediction: { riskLevel: 'HIGH' } } as any,
      { patientId: '2', patientName: 'B', prediction: { riskLevel: 'MEDIUM' } } as any,
      { patientId: '3', patientName: 'C', prediction: { riskLevel: 'LOW' } } as any,
      { patientId: '4', patientName: 'D', prediction: { riskLevel: 'HIGH' } } as any,
    ];

    expect(component.highCount).toBe(2);
    expect(component.mediumCount).toBe(1);
    expect(component.lowCount).toBe(1);
  });

  // ─────────────────────────────
  // LOAD (HTTP MOCK)
  // ─────────────────────────────
  it('should call patients API on load', () => {
    component.load();

    const req = httpMock.expectOne(`${API_BASE_URL}/users/patients`);
    expect(req.request.method).toBe('GET');

    req.flush([]);
  });
});