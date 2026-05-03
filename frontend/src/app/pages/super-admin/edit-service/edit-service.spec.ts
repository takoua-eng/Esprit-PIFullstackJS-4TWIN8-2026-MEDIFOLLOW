import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';

import { EditServiceComponent } from './edit-service';

describe('EditServiceComponent', () => {
  let component: EditServiceComponent;
  let fixture: ComponentFixture<EditServiceComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockData = {
    name: 'Cardiology',
    code: 'CARD',
    description: 'Heart service',
    isActive: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditServiceComponent, ReactiveFormsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -------------------
  // CREATE
  // -------------------
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -------------------
  // INIT FORM
  // -------------------
  it('should initialize form with data', () => {
    expect(component.serviceForm.value.name).toBe('Cardiology');
    expect(component.serviceForm.value.code).toBe('CARD');
    expect(component.serviceForm.value.description).toBe('Heart service');
    expect(component.serviceForm.value.isActive).toBeTrue();
  });

  // -------------------
  // SUBMIT VALID FORM
  // -------------------
  it('should close dialog with form data when valid', () => {
    component.serviceForm.setValue({
      name: 'Neurology',
      code: 'NEU',
      description: 'Brain service',
      isActive: false
    });

    component.onSubmit();

    expect(mockDialogRef.close).toHaveBeenCalledWith({
      name: 'Neurology',
      code: 'NEU',
      description: 'Brain service',
      isActive: false
    });
  });

  // -------------------
  // SUBMIT INVALID FORM
  // -------------------
  it('should NOT close dialog when form is invalid', () => {
    component.serviceForm.setValue({
      name: '',
      code: '',
      description: '',
      isActive: true
    });

    component.onSubmit();

    expect(mockDialogRef.close).not.toHaveBeenCalledWith(jasmine.anything());
  });

  // -------------------
  // CANCEL
  // -------------------
  it('should close dialog on cancel', () => {
    component.onCancel();

    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});