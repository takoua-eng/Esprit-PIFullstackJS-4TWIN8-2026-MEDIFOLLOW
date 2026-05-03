import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { EditNurse } from './edit-nurse';
import { NurseService } from 'src/app/services/superadmin/nurse.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

describe('EditNurse', () => {
  let component: EditNurse;
  let fixture: ComponentFixture<EditNurse>;

  const mockNurse = {
    _id: '1',
    firstName: 'Ali',
    lastName: 'Ben',
    email: 'ali@test.com',
    phone: '22123456',
    address: 'Tunis',
    nationalId: '12345678',
    gender: 'Male',
    serviceId: '1',
    photo: ''
  };

  const nurseServiceMock = {
    updateNurse: jasmine.createSpy().and.returnValue(of({}))
  };

  const serviceServiceMock = {
    getServices: jasmine.createSpy().and.returnValue(of([]))
  };

  const dialogRefMock = {
    close: jasmine.createSpy()
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditNurse, ReactiveFormsModule],
      providers: [
        { provide: NurseService, useValue: nurseServiceMock },
        { provide: ServiceService, useValue: serviceServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: mockNurse }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditNurse);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --------------------------
  // CREATE
  // --------------------------
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // --------------------------
  // FORM INIT
  // --------------------------
  it('should initialize form with data', () => {
    expect(component.nurseForm.value.firstName).toBe('Ali');
    expect(component.nurseForm.value.email).toBe('ali@test.com');
  });

  // --------------------------
  // INITIALS
  // --------------------------
  it('should return initials', () => {
    expect(component.getInitials('Ali', 'Ben')).toBe('AB');
  });

  // --------------------------
  // LOAD SERVICES
  // --------------------------
  it('should load services', () => {
    expect(serviceServiceMock.getServices).toHaveBeenCalled();
  });

  // --------------------------
  // CANCEL
  // --------------------------
  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRefMock.close).toHaveBeenCalled();
  });

  // --------------------------
  // SUBMIT VALID FORM
  // --------------------------
  it('should submit form successfully', () => {
    component.nurseForm.patchValue({
      firstName: 'Ali',
      lastName: 'Ben',
      email: 'ali@test.com'
    });

    component.onSubmit();

    expect(nurseServiceMock.updateNurse).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });
});