// ══════════════════════════════════════════════════════════════
//  coordinator-dashboard.component.spec.ts
// ══════════════════════════════════════════════════════════════
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { TablerIconsModule } from 'angular-tabler-icons';
import { TranslateModule } from '@ngx-translate/core';

import { CoordinatorDashboardComponent } from './coordinator-dashboard.component';
import { CoordinatorService } from 'src/app/services/coordinator.service';
import { CoreService } from 'src/app/services/core.service';

const mockDashboardData = {
  summary: {
    totalAssignedPatients: 4,
    departmentsCovered: 2,
    completeProfiles: 3,
    missingEmergencyContact: 1,
    patientsWithMedicalRecord: 4,
    remindersSentToday: 2,
    pendingReminders: 1,
    missingVitalsToday: 1,
    missingSymptomsToday: 0,
  },
  departmentDistribution: [
    { label: 'Cardiology', value: 2 },
    { label: 'Oncology', value: 2 },
  ],
  recentPatients: [
    { _id: 'p1', name: 'Karim Sassi', email: 'k@test.com', department: 'Cardiology', status: 'Complete' },
  ],
};

const mockCoordinatorService = {
  getDashboard:            jasmine.createSpy('getDashboard').and.returnValue(of(mockDashboardData)),
  getAssignedPatients:     jasmine.createSpy('getAssignedPatients').and.returnValue(of([])),
  getComplianceToday:      jasmine.createSpy('getComplianceToday').and.returnValue(of([])),
  getPatientsWithCompliance: jasmine.createSpy('getPatientsWithCompliance').and.returnValue(of([])),
};

const mockCoreService = {
  currentUser: jasmine.createSpy('currentUser').and.returnValue({ _id: 'coord123' }),
};

describe('CoordinatorDashboardComponent', () => {
  let component: CoordinatorDashboardComponent;
  let fixture: ComponentFixture<CoordinatorDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinatorDashboardComponent, HttpClientTestingModule, NoopAnimationsModule, TablerIconsModule.pick({}), TranslateModule.forRoot()],
      providers: [
        { provide: CoordinatorService, useValue: mockCoordinatorService },
        { provide: CoreService, useValue: mockCoreService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinatorDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockCoordinatorService.getDashboard.calls.reset();
    mockCoordinatorService.getAssignedPatients.calls.reset();
    mockCoordinatorService.getComplianceToday.calls.reset();
    mockCoordinatorService.getPatientsWithCompliance.calls.reset();
    mockCoreService.currentUser.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load dashboard data on init', () => {
    expect(mockCoordinatorService.getDashboard).toHaveBeenCalled();
  });

  it('should have coordinator ID set from CoreService', () => {
    expect(component.coordinatorId).toBe('coord123');
  });
});
