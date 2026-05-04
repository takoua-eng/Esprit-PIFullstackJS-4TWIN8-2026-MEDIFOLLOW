import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { StrokeRiskComponent } from './stroke-risk.component';
import { API_BASE_URL } from 'src/app/core/api.config';
import { AuthSessionService } from 'src/app/services/auth-session.service';

describe('StrokeRiskComponent', () => {
  let component: StrokeRiskComponent;
  let fixture: ComponentFixture<StrokeRiskComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StrokeRiskComponent, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: AuthSessionService, useValue: { getUser: () => null } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(StrokeRiskComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { httpMock.verify(); });

  it('should create', () => {
    fixture.detectChanges();
    httpMock.expectOne(r => r.url.includes('/ai/stroke-risk-all')).flush([]);
    expect(component).toBeTruthy();
  });

  it('should return correct level color', () => {
    expect(component.levelColor('HIGH')).toBe('#d63031');
    expect(component.levelColor('MEDIUM')).toBe('#fdcb6e');
    expect(component.levelColor('LOW')).toBe('#00b894');
    expect(component.levelColor('UNKNOWN')).toBe('#b2bec3');
  });

  it('should return correct level background', () => {
    expect(component.levelBg('HIGH')).toContain('#d63031');
    expect(component.levelBg('MEDIUM')).toContain('#fdcb6e');
    expect(component.levelBg('LOW')).toContain('#00b894');
  });

  it('should filter results by text and level', () => {
    component.results = [
      { patientId: '1', patientName: 'Ali Ben', prediction: { riskScore: 0.9, riskLevel: 'HIGH', riskColor: '', clusterLabel: '', recommendations: [] } },
      { patientId: '2', patientName: 'Sara Test', prediction: { riskScore: 0.3, riskLevel: 'LOW', riskColor: '', clusterLabel: '', recommendations: [] } },
    ] as any;
    component.searchText = 'ali';
    component.filterLevel = 'ALL';
    component.applyFilters();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].patientName).toBe('Ali Ben');
  });

  it('should count risk levels correctly', () => {
    component.results = [
      { patientId: '1', patientName: 'A', prediction: { riskLevel: 'HIGH' } },
      { patientId: '2', patientName: 'B', prediction: { riskLevel: 'MEDIUM' } },
      { patientId: '3', patientName: 'C', prediction: { riskLevel: 'LOW' } },
      { patientId: '4', patientName: 'D', prediction: { riskLevel: 'HIGH' } },
    ] as any;
    expect(component.highCount).toBe(2);
    expect(component.mediumCount).toBe(1);
    expect(component.lowCount).toBe(1);
  });

  it('should call stroke-risk-all API on load', () => {
    fixture.detectChanges();
    const req = httpMock.expectOne(r => r.url.includes('/ai/stroke-risk-all'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
