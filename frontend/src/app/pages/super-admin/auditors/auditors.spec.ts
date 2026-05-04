import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { AuditorsComponent } from './auditors';
import { AuditorService } from '../../../services/superadmin/auditor.service';
import { AlertsApiService } from '../../../services/alerts-api.service';
import { CoreService } from 'src/app/services/core.service';

const mockAuditors = [
  { _id: '1', firstName: 'Alice', lastName: 'Smith', email: 'alice@test.com', isArchived: false, isActive: true },
  { _id: '2', firstName: 'Bob', lastName: 'Jones', email: 'bob@test.com', isArchived: true, isActive: false },
];

describe('AuditorsComponent', () => {
  let component: AuditorsComponent;
  let fixture: ComponentFixture<AuditorsComponent>;
  let auditorServiceSpy: jasmine.SpyObj<AuditorService>;
  let alertsServiceSpy: jasmine.SpyObj<AlertsApiService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    auditorServiceSpy = jasmine.createSpyObj('AuditorService', [
      'getAuditors', 'archiveAuditor', 'activateAuditor', 'deactivateAuditor'
    ]);
    alertsServiceSpy = jasmine.createSpyObj('AlertsApiService', ['getAlerts']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    auditorServiceSpy.getAuditors.and.returnValue(of(mockAuditors as any));
    alertsServiceSpy.getAlerts.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [AuditorsComponent, HttpClientTestingModule, NoopAnimationsModule, TranslateModule.forRoot()],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: AuditorService, useValue: auditorServiceSpy },
        { provide: AlertsApiService, useValue: alertsServiceSpy },
        { provide: CoreService, useValue: { hasPermission: () => true } },
      ],
    })
      .overrideProvider(MatDialog, { useValue: dialogSpy })
      .compileComponents();

    fixture = TestBed.createComponent(AuditorsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load auditors on init', () => {
    expect(component).toBeTruthy();
    expect(auditorServiceSpy.getAuditors).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
  });

  it('should filter auditors properly', () => {
    const event = { target: { value: 'alice' } } as unknown as Event;
    component.applyFilter(event);
    expect(component.dataSource.filter).toBe('alice');
  });

  it('should return correct full name', () => {
    const row = { _id: '1', firstName: 'Alice', lastName: 'Smith', email: '', isArchived: false };
    expect(component.getFullName(row)).toBe('Alice Smith');
  });

  it('should return initials from full name', () => {
    expect(component.getInitials('Alice Smith')).toBe('AS');
  });

  it('should open AddAuditorDialog on addAuditor and reload on success', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    component.addAuditor();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(auditorServiceSpy.getAuditors).toHaveBeenCalledTimes(2);
  });

  it('should toggle status of auditor (with confirmation)', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRefSpy);
    auditorServiceSpy.deactivateAuditor.and.returnValue(of({}));

    const row = { _id: '1', firstName: 'Alice', lastName: 'Smith', email: '', isArchived: false, isActive: true };
    component.toggleStatus(row);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(auditorServiceSpy.deactivateAuditor).toHaveBeenCalledWith('1');
  });

  it('should edit auditor', () => {
    const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
    dialogRefSpy.afterClosed.and.returnValue(of(true));
    dialogSpy.open.and.returnValue(dialogRefSpy);

    const row = { _id: '1', firstName: 'Alice', lastName: 'Smith', email: '', isArchived: false };
    component.editAuditor(row);

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(auditorServiceSpy.getAuditors).toHaveBeenCalledTimes(2);
  });
});
