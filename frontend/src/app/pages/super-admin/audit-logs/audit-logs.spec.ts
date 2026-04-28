import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AuditLogsComponent } from './audit-logs';
import { AuditApiService } from '../../../services/audit.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

const mockLogs = [
  {
    _id: 'log1', userId: 'u1', userEmail: 'admin@test.com', userRole: 'super-admin',
    userName: 'Admin User', action: 'CREATE', entityType: 'USERS_PATIENTS',
    entityId: 'p1', before: null, after: {}, ipAddress: '127.0.0.1',
    userAgent: 'Chrome', createdAt: new Date().toISOString(),
  },
  {
    _id: 'log2', userId: 'u2', userEmail: 'nurse@test.com', userRole: 'nurse',
    userName: 'Nurse User', action: 'DELETE', entityType: 'ALERT',
    entityId: 'a1', before: {}, after: null, ipAddress: '192.168.1.1',
    userAgent: 'Firefox', createdAt: new Date().toISOString(),
  },
];

const mockStats = {
  total: 100, byAction: [], byEntity: [], byUser: [], last24h: [], last7days: [],
  criticalChanges: 3, loginCount: 20, patientModifications: 10,
  alertsGenerated: 5, totalLast7days: 50,
};

const mockAuditService = {
  getLogs: jest.fn().mockReturnValue(of(mockLogs)),
  getStats: jest.fn().mockReturnValue(of(mockStats)),
  deleteLog: jest.fn().mockReturnValue(of({})),
};

const mockDialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }) };

describe('AuditLogsComponent', () => {
  let component: AuditLogsComponent;
  let fixture: ComponentFixture<AuditLogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: AuditApiService, useValue: mockAuditService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load logs and stats on init', () => {
    expect(mockAuditService.getLogs).toHaveBeenCalled();
    expect(mockAuditService.getStats).toHaveBeenCalled();
  });

  it('should populate stats from backend', () => {
    expect(component.totalActions).toBe(50);
    expect(component.loginCount).toBe(20);
    expect(component.patientModifications).toBe(10);
    expect(component.alertsGenerated).toBe(5);
    expect(component.criticalChanges).toBe(3);
  });

  it('should filter logs by user email', () => {
    component.allLogs = mockLogs as any;
    component.filterUser = 'admin';
    component.applyFilters();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].userEmail).toBe('admin@test.com');
  });

  it('should filter logs by action', () => {
    component.allLogs = mockLogs as any;
    component.filterAction = 'DELETE';
    component.applyFilters();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].action).toBe('DELETE');
  });

  it('should clear all filters', () => {
    component.filterUser = 'admin';
    component.filterAction = 'CREATE';
    component.allLogs = mockLogs as any;
    component.clearFilters();
    expect(component.filterUser).toBe('');
    expect(component.filterAction).toBe('');
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should return correct action color', () => {
    expect(component.actionColor('CREATE')).toBe('#00b894');
    expect(component.actionColor('DELETE')).toBe('#d63031');
    expect(component.actionColor('LOGIN')).toBe('#6c5ce7');
    expect(component.actionColor('UNKNOWN')).toBe('#636e72');
  });

  it('should return correct action icon', () => {
    expect(component.actionIcon('CREATE')).toBe('circle-plus');
    expect(component.actionIcon('DELETE')).toBe('trash');
    expect(component.actionIcon('LOGIN')).toBe('login');
    expect(component.actionIcon('UNKNOWN')).toBe('activity');
  });

  it('should open detail dialog on viewDetail', () => {
    component.viewDetail(mockLogs[0] as any);
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should unsubscribe on destroy', () => {
    expect(() => component.ngOnDestroy()).not.toThrow();
  });
});
