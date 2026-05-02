import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AddPatientDialog } from './add-patient-dialog';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AddPatientDialog (Super Admin)', () => {
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddPatientDialog>>;

  const setupTestBed = async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        AddPatientDialog,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy }
      ]
    })
    .overrideComponent(AddPatientDialog, {
      set: {
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy }
        ]
      }
    })
    .compileComponents();

    const fixture = TestBed.createComponent(AddPatientDialog);
    const component = fixture.componentInstance;
    return { fixture, component };
  };

  let component: AddPatientDialog;
  let fixture: ComponentFixture<AddPatientDialog>;

  beforeEach(async () => {
    const setup = await setupTestBed();
    fixture = setup.fixture;
    component = setup.component;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should not submit if form is invalid', () => {
    component.patientForm.controls['firstName'].setValue('');
    component.onSubmit();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should close and pass formData if form is valid', () => {
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - 25);

    component.patientForm.patchValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'Password123!',
      phone: '98765432',
      nationalId: '12345678',
      address: '1234567890 Main St',
      dateOfBirth: dob,
      gender: 'female',
      maritalStatus: 'single',
      emergencyContact: '98765431'
    });

    component.onSubmit();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });
});
