import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { EditAuditorDialog } from './edit-auditor';
import { AuditorService } from 'src/app/services/superadmin/auditor.service';

describe('EditAuditorDialog', () => {
  let component: EditAuditorDialog;
  let fixture: ComponentFixture<EditAuditorDialog>;

  const mockAuditor = {
    _id: '1',
    firstName: 'Ali',
    lastName: 'Ben',
    email: 'ali@test.com',
    phone: '22123456',
    address: 'Tunis',
    nationalId: '12345678',
    gender: 'Male',
    isActive: true,
    photo: '',
  };

  const mockAuditorService = {
    updateAuditor: jasmine.createSpy('updateAuditor').and.returnValue(of({})),
  };

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditAuditorDialog, ReactiveFormsModule, NoopAnimationsModule],
      providers: [
        { provide: AuditorService, useValue: mockAuditorService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockAuditor },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditAuditorDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─────────────────────────────
  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────
  it('should initialize form with data', () => {
    expect(component.auditorForm.get('firstName')?.value).toBe('Ali');
    expect(component.auditorForm.get('email')?.value).toBe('ali@test.com');
  });

  // ─────────────────────────────
  it('should return full name', () => {
    component.auditorForm.patchValue({
      firstName: 'Ali',
      lastName: 'Ben',
    });

    expect(component.getFullName()).toBe('Ali Ben');
  });

  // ─────────────────────────────
  it('should return initials', () => {
    expect(component.getInitials('A', 'B')).toBe('AB');
    expect(component.getInitials('', '')).toBe('?');
  });

  // ─────────────────────────────
  it('should handle cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  // ─────────────────────────────
  it('should submit form successfully', () => {
    component.auditorForm.patchValue({
      firstName: 'Ali',
      lastName: 'Ben',
      email: 'ali@test.com',
    });

    component.onSubmit();

    expect(mockAuditorService.updateAuditor).toHaveBeenCalled();
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  // ─────────────────────────────
  it('should handle submit error', () => {
    spyOn(window, 'alert');

    mockAuditorService.updateAuditor.and.returnValue(
      throwError(() => new Error('fail'))
    );

    component.onSubmit();

    expect(window.alert).toHaveBeenCalled();
  });
});