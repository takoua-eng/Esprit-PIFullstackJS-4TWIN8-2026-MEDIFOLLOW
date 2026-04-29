// ══════════════════════════════════════════════════════════════
//  coordinator-dashboard.component.spec.ts
// ══════════════════════════════════════════════════════════════
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CoordinatorDashboard } from './coordinator-dashboard.component';
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
  getDashboard: jest.fn().mockReturnValue(of(mockDashboardData)),
  getAssignedPatients: jest.fn().mockReturnValue(of([])),
  getComplianceToday: jest.fn().mockReturnValue(of([])),
  getPatientsWithCompliance: jest.fn().mockReturnValue(of([])),
};

const mockCoreService = {
  currentUser: jest.fn().mockReturnValue({ _id: 'coord123' }),
};

describe('CoordinatorDashboard', () => {
  let component: CoordinatorDashboard;
  let fixture: ComponentFixture<CoordinatorDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoordinatorDashboard, HttpClientTestingModule, NoopAnimationsModule],
      providers: [
        { provide: CoordinatorService, useValue: mockCoordinatorService },
        { provide: CoreService, useValue: mockCoreService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CoordinatorDashboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => jest.clearAllMocks());

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

