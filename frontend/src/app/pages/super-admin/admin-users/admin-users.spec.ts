import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { AdminUsersComponent } from './admin-users';
import { AdminService } from '../../../services/superadmin/admin.service';

describe('AdminUsersComponent', () => {
  let component: AdminUsersComponent;
  let fixture: ComponentFixture<AdminUsersComponent>;

  const mockAdminService = {
    getAdmins: jasmine.createSpy('getAdmins').and.returnValue(of([])),
  };

  const mockDialog = {
    open: jasmine.createSpy('open'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUsersComponent, NoopAnimationsModule],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminUsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load admins on init', () => {
    expect(mockAdminService.getAdmins).toHaveBeenCalled();
  });

  it('should return correct initials', () => {
    expect(component.getInitials('John Doe')).toBe('JD');
    expect(component.getInitials('')).toBe('?');
  });

  it('should apply filter', () => {
    const event = { target: { value: 'test' } } as any;

    component.applyFilter(event);

    expect(component.dataSource.filter).toBe('test');
  });
});