import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddAuditorDialog } from './add-auditor-dialog';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('AddAuditorDialog', () => {
  let component: AddAuditorDialog;
  let fixture: ComponentFixture<AddAuditorDialog>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddAuditorDialog>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        AddAuditorDialog,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    })
    .overrideComponent(AddAuditorDialog, {
      set: {
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MAT_DIALOG_DATA, useValue: {} }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAuditorDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should not close dialog on submit if form is invalid', () => {
    component.auditorForm.controls['firstName'].setValue(''); // Invalid
    component.onSubmit();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should close dialog with form data on submit if form is valid', () => {
    component.auditorForm.controls['firstName'].setValue('John');
    component.auditorForm.controls['lastName'].setValue('Doe');
    component.auditorForm.controls['email'].setValue('john.doe@example.com');
    component.auditorForm.controls['phone'].setValue('1234567890');
    component.auditorForm.controls['department'].setValue('Cardiology');
    component.auditorForm.controls['certifications'].setValue('CPA');
    component.auditorForm.controls['yearsExperience'].setValue(5);
    component.auditorForm.controls['focusArea'].setValue('Compliance');

    component.onSubmit();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(component.auditorForm.value);
  });

  it('should return correct error messages', () => {
    const emailControl = component.auditorForm.get('email');
    emailControl?.setValue('');
    emailControl?.markAsTouched();
    expect(component.getErrorMessage('email')).toContain('Email is required');

    emailControl?.setValue('invalid-email');
    expect(component.getErrorMessage('email')).toContain('valid email');
  });
});
