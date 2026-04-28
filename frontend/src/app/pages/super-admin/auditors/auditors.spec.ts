import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditorsComponent } from './auditors';
import { AuditorService } from '../../../services/superadmin/auditor.service';
import { AlertsApiService } from '../../../services/alerts-api.service';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientTestingModule } from '@angular/common/http/testing';

const mockAuditors = [
  { _id: '1', firstName: 'Alice', lastName: 'Dupont', email: 'alice@test.com', isArchived: false, isActive: true },
  { _id: '2', firstName: 'Bob', lastName: 'Martin', email: 'bob@test.com', isArchived: true, isActive: false },
];

const mockAuditorService = {
  getAuditors: jest.fn().mockReturnValue(of(mockAuditors)),
  archiveAuditor: jest.fn().mockReturnValue(of({})),
  activateAuditor: jest.fn().mockReturnValue(of({})),
  deactivateAuditor: jest.fn().mockReturnValue(of({})),
};

const mockAlertsService = {
  getAlerts: jest.fn().mockReturnValue(of([{ status: 'open' }, { status: 'closed' }])),
};

const mockDialog = { open: jest.fn().mockReturnValue({ afterClosed: () => of(true) }) };
const mockCoreService = { appLanguage: 'en' };

describe('AuditorsComponent', () => {
  let component: AuditorsComponent;
  let fixture: ComponentFixture<AuditorsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditorsComponent, NoopAnimationsModule, HttpClientTestingModule],
      providers: [
        { provide: AuditorService, useValue: mockAuditorService },
        { provide: AlertsApiService, useValue: mockAlertsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: CoreService, useValue: mockCoreService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should load auditors on init', () => {
    expect(mockAuditorService.getAuditors).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should load alert count on init', () => {
    expect(mockAlertsService.getAlerts).toHaveBeenCalled();
    expect(component.alertCount).toBe(1); // only 'open' alerts
  });

  it('should apply filter correctly', () => {
    const event = { target: { value: 'alice' } } as any;
    component.applyFilter(event);
    expect(component.dataSource.filter).toBe('alice');
  });

  it('should return correct full name', () => {
    const row = { _id: '1', firstName: 'Alice', lastName: 'Dupont', email: '', isArchived: false };
    expect(component.getFullName(row)).toBe('Alice Dupont');
  });

  it('should return initials from full name', () => {
    expect(component.getInitials('Alice Dupont')).toBe('AD');
  });

  it('should return "?" for empty name', () => {
    expect(component.getInitials('')).toBe('?');
  });

  it('should return photo URL when photo exists', () => {
    expect(component.getPhoto('avatar.png')).toContain('avatar.png');
  });

  it('should return empty string when no photo', () => {
    expect(component.getPhoto()).toBe('');
  });

  it('should open add auditor dialog', () => {
    component.addAuditor();
    expect(mockDialog.open).toHaveBeenCalled();
  });
});
