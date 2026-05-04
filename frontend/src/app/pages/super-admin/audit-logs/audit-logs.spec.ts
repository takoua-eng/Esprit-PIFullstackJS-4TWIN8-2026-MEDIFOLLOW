import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { AuditLogsComponent } from './audit-logs';
import { AuditApiService } from '../../../services/audit.service';

const mockLogs = [
  { _id: '1', createdAt: new Date().toISOString(), userEmail: 'admin@test.com', userName: 'Admin', action: 'LOGIN', entityType: 'USER', entityId: '1', ipAddress: '127.0.0.1', risk: 'NORMAL', verified: false },
  { _id: '2', createdAt: new Date().toISOString(), userEmail: 'nurse@test.com', userName: 'Nurse', action: 'UPDATE', entityType: 'PATIENT', entityId: '2', ipAddress: '192.168.1.1', risk: 'SUSPICIOUS', verified: true },
];

const mockStats = { totalLast7days: 10, loginCount: 3, patientModifications: 2, alertsGenerated: 1, criticalChanges: 0 };

describe('AuditLogsComponent', () => {
  let component: AuditLogsComponent;
  let fixture: ComponentFixture<AuditLogsComponent>;
  let auditServiceSpy: jasmine.SpyObj<AuditApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    auditServiceSpy = jasmine.createSpyObj('AuditApiService', ['getLogs', 'getStats', 'deleteLog']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    auditServiceSpy.getLogs.and.returnValue(of(mockLogs as any));
    auditServiceSpy.getStats.and.returnValue(of(mockStats as any));

    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent, HttpClientTestingModule, NoopAnimationsModule],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: AuditApiService, useValue: auditServiceSpy },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialogSpy })
      .compileComponents();

    fixture = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load logs on init', () => {
    expect(auditServiceSpy.getLogs).toHaveBeenCalled();
    expect(component.allLogs.length).toBe(2);
    expect(component.totalActions).toBe(10);
    expect(component.loginCount).toBe(3);
  });

  it('should apply search filter', () => {
    component.filterSearch = 'admin';
    component.applyFilters();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].userEmail).toBe('admin@test.com');
  });

  it('should apply action filter', () => {
    component.filterAction = 'LOGIN';
    component.applyFilters();
    expect(component.dataSource.data.length).toBe(1);
  });

  it('should clear filters', () => {
    component.filterSearch = 'admin';
    component.filterAction = 'LOGIN';
    component.clearFilters();
    expect(component.filterSearch).toBe('');
    expect(component.filterAction).toBe('');
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should return correct action color', () => {
    expect(component.actionColor('CREATE')).toBe('#00b894');
    expect(component.actionColor('DELETE')).toBe('#d63031');
    expect(component.actionColor('LOGIN')).toBe('#6c5ce7');
  });

  it('should return correct action icon', () => {
    expect(component.actionIcon('CREATE')).toBe('circle-plus');
    expect(component.actionIcon('DELETE')).toBe('trash');
    expect(component.actionIcon('LOGIN')).toBe('login');
  });

  it('should return correct role color', () => {
    expect(component.roleColor('admin')).toBe('#0984e3');
    expect(component.roleColor('doctor')).toBe('#00b894');
  });

  it('should format IP correctly', () => {
    expect(component.formatIp('::1')).toBe('localhost');
    expect(component.formatIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    expect(component.formatIp('unknown')).toBe('—');
  });

  it('should return display name preferring userName over email', () => {
    const log = { userName: 'Admin User', userEmail: 'admin@test.com' } as any;
    expect(component.displayName(log)).toBe('Admin User');
  });

  it('should open detail dialog on viewDetail', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(null));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.viewDetail(mockLogs[0] as any);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should group logs into timeline', () => {
    expect(component.timelineGroups.length).toBeGreaterThan(0);
  });
});
