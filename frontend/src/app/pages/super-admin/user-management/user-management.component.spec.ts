import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { UserManagementComponent } from './user-management.component';

fdescribe('UserManagementComponent', () => {
  let component: UserManagementComponent;
  let fixture: ComponentFixture<UserManagementComponent>;

  const mockUserService = {
    getAllUsers: () => of([]),
    getByRole: () => of([]),
  };

  const mockDialog = {
    open: jasmine.createSpy('open').and.returnValue({
      afterClosed: () => of(true),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserManagementComponent],
      providers: [
        { provide: 'UserManagementService', useValue: mockUserService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load users', () => {
    expect(component.dataSource).toBeDefined();
  });

  it('should open add dialog', () => {
    component.openAdd();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should change role and reload', () => {
    component.selectRole('doctor');
    expect(component.selectedRole).toBe('doctor');
  });
});