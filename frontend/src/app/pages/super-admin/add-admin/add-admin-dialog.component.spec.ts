import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

import { AddAdminDialog } from './add-admin';
import { AdminService } from 'src/app/services/superadmin/admin.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

describe('AddAdminDialog', () => {
  let component: AddAdminDialog;
  let fixture: ComponentFixture<AddAdminDialog>;

  let adminServiceMock: jasmine.SpyObj<AdminService>;
  let serviceServiceMock: jasmine.SpyObj<ServiceService>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<AddAdminDialog>>;

  beforeEach(async () => {
    adminServiceMock = jasmine.createSpyObj('AdminService', ['createAdmin']);
    serviceServiceMock = jasmine.createSpyObj('ServiceService', ['getServices']);
    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AddAdminDialog],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: ServiceService, useValue: serviceServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddAdminDialog);
    component = fixture.componentInstance;

    serviceServiceMock.getServices.and.returnValue(of([]));

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should invalidate empty form', () => {
    expect(component.adminForm.valid).toBeFalse();
  });

  it('should validate correct form', () => {
    component.adminForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'Password@123',
      phone: '22123456',
      nationalId: '12345678',
      address: 'Tunis street 12345',
      gender: 'male',
      serviceId: '1',
      isActive: true,
    });

    expect(component.adminForm.valid).toBeTrue();
  });

  it('should load services', () => {
    serviceServiceMock.getServices.and.returnValue(
      of([{ id: 1, name: 'Cardio' }])
    );

    component.loadServices();

    expect(component.services.length).toBe(1);
  });

  it('should return error message for required field', () => {
    const control = component.adminForm.get('firstName');
    control?.markAsTouched();

    expect(component.getErrorMessage('firstName')).toContain('required');
  });

  it('should generate initials', () => {
    expect(component.getInitials('John', 'Doe')).toBe('JD');
  });

  // ✅ FIX ICI
  it('should submit form successfully', () => {
    adminServiceMock.createAdmin.and.returnValue(
      of({
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        phone: '22123456',
        role: 'admin',
        isActive: true,
      } as any) // 👈 simplifie le typage pour test
    );

    component.adminForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'Password@123',
      phone: '22123456',
      nationalId: '12345678',
      address: 'Tunis street 12345',
      gender: 'male',
      serviceId: '1',
      isActive: true,
    });

    component.onSubmit();

    expect(adminServiceMock.createAdmin).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  it('should handle submit error', () => {
    spyOn(window, 'alert');

    adminServiceMock.createAdmin.and.returnValue(
      throwError(() => new Error('error'))
    );

    component.adminForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: 'Password@123',
      phone: '22123456',
      nationalId: '12345678',
      address: 'Tunis street 12345',
      gender: 'male',
      serviceId: '1',
      isActive: true,
    });

    component.onSubmit();

    expect(window.alert).toHaveBeenCalled();
  });
});