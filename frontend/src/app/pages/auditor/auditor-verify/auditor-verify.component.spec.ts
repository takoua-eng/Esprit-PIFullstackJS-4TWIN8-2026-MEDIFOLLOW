import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AuditorVerifyComponent } from './auditor-verify.component';
import { AuditApiService } from 'src/app/services/audit.service';
import { of } from 'rxjs';

describe('AuditorVerifyComponent', () => {
  let component: AuditorVerifyComponent;
  let fixture: ComponentFixture<AuditorVerifyComponent>;
  let auditServiceMock: any;

  beforeEach(async () => {
    auditServiceMock = {
      getLogs: jasmine.createSpy().and.returnValue(of([
        {
          _id: '1',
          createdAt: new Date().toISOString(),
          userEmail: 'test@test.com',
          userName: 'Test',
          action: 'CREATE',
          entityType: 'USER',
          entityId: '123',
          ipAddress: '127.0.0.1',
        },
      ])),
      getStats: jasmine.createSpy().and.returnValue(
        of({
          totalLast7days: 10,
          criticalChanges: 2,
          loginCount: 5,
        })
      ),
    };

    await TestBed.configureTestingModule({
      imports: [
        AuditorVerifyComponent,
        HttpClientTestingModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AuditApiService, useValue: auditServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorVerifyComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────
  // LOAD DATA
  // ─────────────────────────────
  it('should load logs and stats', () => {
    expect(auditServiceMock.getLogs).toHaveBeenCalled();
    expect(auditServiceMock.getStats).toHaveBeenCalled();

    expect(component.totalLogs).toBe(10);
    expect(component.criticalCount).toBe(2);
    expect(component.loginCount).toBe(5);
  });

  // ─────────────────────────────
  // VERIFY / UNVERIFY
  // ─────────────────────────────
  it('should verify and unverify row', () => {
    const row: any = { _id: '1', verified: false };

    component.dataSource.data = [row];

    component.verify(row);
    expect(row.verified).toBeTrue();

    component.unverify(row);
    expect(row.verified).toBeFalse();
  });

  it('should verify all rows', () => {
    const rows: any[] = [
      { verified: false },
      { verified: false },
    ];

    component.dataSource.data = rows;

    component.verifyAll();

    expect(component.dataSource.data.every(r => r.verified)).toBeTrue();
  });

  // ─────────────────────────────
  // FILTERS
  // ─────────────────────────────
  it('should filter logs by search', () => {
    component.allLogs = [
      {
        userEmail: 'a@test.com',
        userName: 'Ali',
        action: 'CREATE',
        entityType: 'USER',
        entityId: '1',
        createdAt: new Date().toISOString(),
      } as any,
    ];

    component.filterSearch = 'Ali';

    component.applyFilters();

    expect(component.dataSource.data.length).toBe(1);
  });

  it('should clear filters', () => {
    component.filterSearch = 'test';
    component.filterAction = 'CREATE';

    component.clearFilters();

    expect(component.filterSearch).toBe('');
    expect(component.filterAction).toBe('');
  });

  // ─────────────────────────────
  // HELPERS
  // ─────────────────────────────
  it('should format IP correctly', () => {
    expect(component.formatIp('127.0.0.1')).toBe('localhost');
    expect(component.formatIp('::1')).toBe('localhost');
    expect(component.formatIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    expect(component.formatIp('unknown')).toBe('—');
  });

  it('should return display name', () => {
    const log: any = {
      userName: 'Ali',
      userEmail: 'ali@test.com',
    };

    expect(component.displayName(log)).toBe('Ali');
  });

  it('should return role color', () => {
    expect(component.roleColor('doctor')).toBe('#00b894');
    expect(component.roleColor('unknown')).toBe('#b2bec3');
  });

  it('should return action color', () => {
    expect(component.actionColor('CREATE')).toBe('#00b894');
    expect(component.actionColor('DELETE')).toBe('#d63031');
  });

  it('should return action icon', () => {
    expect(component.actionIcon('CREATE')).toBe('circle-plus');
    expect(component.actionIcon('UNKNOWN')).toBe('activity');
  });

  // ─────────────────────────────
  // GETTERS
  // ─────────────────────────────
  it('should compute verified and pending counts', () => {
    component.dataSource.data = [
      { verified: true },
      { verified: false },
    ] as any;

    expect(component.verifiedCount).toBe(1);
    expect(component.pendingCount).toBe(1);
  });
});