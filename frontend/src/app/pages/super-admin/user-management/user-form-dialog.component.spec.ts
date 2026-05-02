import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { UserFormDialog } from './user-form-dialog';

// Mock services
import { UserManagementService } from '../../../services/superadmin/user-management.service';
import { ServiceService } from '../../../services/superadmin/service.service';
import { RoleService } from '../../../services/superadmin/role.service';
import { DoctorService } from '../../../services/superadmin/doctor.service';
import { CoordinateurService } from '../../../services/superadmin/coordinateur.service';
import { NurseService } from '../../../services/superadmin/nurse.service';

describe('UserFormDialog', () => {
  let component: UserFormDialog;
  let fixture: ComponentFixture<UserFormDialog>;

  const dialogRefMock = {
    close: jasmine.createSpy('close'),
  };

  const userMock = {
    _id: '1',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@test.com',
    role: { _id: 'r1', name: 'patient' },
    isActive: true,
  };

  const mockService = {
    create: jasmine.createSpy('create').and.returnValue(of({})),
    update: jasmine.createSpy('update').and.returnValue(of({})),
  };

  const mockServiceService = {
    getActiveServices: jasmine.createSpy().and.returnValue(of([])),
  };

  const mockRoleService = {
    getRoles: jasmine.createSpy().and.returnValue(of([])),
  };

  const mockDoctorService = {
    getDoctors: jasmine.createSpy().and.returnValue(of([])),
  };

  const mockCoordService = {
    getCoordinators: jasmine.createSpy().and.returnValue(of([])),
  };

  const mockNurseService = {
    getNurses: jasmine.createSpy().and.returnValue(of([])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormDialog, ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { role: 'patient', user: null } },

        { provide: UserManagementService, useValue: mockService },
        { provide: ServiceService, useValue: mockServiceService },
        { provide: RoleService, useValue: mockRoleService },
        { provide: DoctorService, useValue: mockDoctorService },
        { provide: CoordinateurService, useValue: mockCoordService },
        { provide: NurseService, useValue: mockNurseService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ======================
  // BASIC TESTS
  // ======================

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form', () => {
    expect(component.form).toBeDefined();
  });

  it('form should be invalid when empty', () => {
    expect(component.form.valid).toBeFalse();
  });

  // ======================
  // ROLE LOGIC
  // ======================

  it('should change role correctly', () => {
    component.onRoleChange('doctor');
    expect(component.currentRoleName).toBe('doctor');
  });

  // ======================
  // DOCTOR CHANGE
  // ======================

  it('should handle doctor change without crash', () => {
    component.onDoctorChange('');
    expect(component.autoServiceName).toBe('');
  });

  // ======================
  // SUBMIT (CREATE)
  // ======================

  it('should call create on submit when valid', () => {
    component.form.patchValue({
      roleId: 'patient',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'Test1234!',
    });

    component.currentRoleName = 'patient';

    component.onSubmit();

    expect(mockService.create).toHaveBeenCalled();
  });

  // ======================
  // CANCEL
  // ======================

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });
});