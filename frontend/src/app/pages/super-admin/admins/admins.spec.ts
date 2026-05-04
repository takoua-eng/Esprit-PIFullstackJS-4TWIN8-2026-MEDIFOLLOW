import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';

import { AdminsComponent } from './admins';
import { AdminService } from '../../../services/superadmin/admin.service';
import { AlertsApiService } from '../../../services/alerts-api.service';
import { CoreService } from 'src/app/services/core.service';

describe('AdminsComponent', () => {
  let component: AdminsComponent;
  let fixture: ComponentFixture<AdminsComponent>;

  const mockAdminService = {
    getAdmins: jasmine.createSpy('getAdmins').and.returnValue(of([])),
    activateAdmin: jasmine.createSpy('activateAdmin').and.returnValue(of({})),
    deactivateAdmin: jasmine.createSpy('deactivateAdmin').and.returnValue(of({})),
    archiveAdmin: jasmine.createSpy('archiveAdmin').and.returnValue(of({})),
  };

  const mockAlertsService = {
    getAlerts: jasmine.createSpy('getAlerts').and.returnValue(of([])),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(false),
    }),
  };

  const mockCore = {
    hasPermission: jasmine.createSpy('hasPermission').and.returnValue(true),
    getPermissions: jasmine.createSpy('getPermissions').and.returnValue(['*']),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminsComponent, NoopAnimationsModule, TranslateModule.forRoot()],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: AlertsApiService, useValue: mockAlertsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: CoreService, useValue: mockCore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load admins on init', () => {
    expect(mockAdminService.getAdmins).toHaveBeenCalled();
  });

  it('should return full name', () => {
    const admin: any = {
      _id: '1',
      firstName: 'Ali',
      lastName: 'Ben',
      email: '',
      isActive: true,
      isArchived: false,
    };

    expect(component.getFullName(admin)).toBe('Ali Ben');
  });

  it('should apply filter', () => {
    const event = { target: { value: 'ali' } } as any;

    component.applyFilter(event);

    expect(component.dataSource.filter).toBe('ali');
  });
});