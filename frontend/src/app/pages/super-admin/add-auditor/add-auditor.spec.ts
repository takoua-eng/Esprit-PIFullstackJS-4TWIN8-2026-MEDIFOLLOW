import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';

import { AddAuditorDialog } from './add-auditor';
import { AuditorService } from 'src/app/services/superadmin/auditor.service';

describe('AddAuditorDialog', () => {
  let component: AddAuditorDialog;
  let fixture: ComponentFixture<AddAuditorDialog>;

  let auditorServiceMock: jasmine.SpyObj<AuditorService>;
  let dialogRefMock: jasmine.SpyObj<MatDialogRef<AddAuditorDialog>>;

  beforeEach(async () => {
    auditorServiceMock = jasmine.createSpyObj('AuditorService', [
      'createAuditor',
    ]);

    dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, AddAuditorDialog],
      providers: [
        { provide: AuditorService, useValue: auditorServiceMock },
        { provide: MatDialogRef, useValue: dialogRefMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddAuditorDialog);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  // ─────────────────────────────
  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────
  it('should initialize form invalid by default', () => {
    expect(component.auditorForm.valid).toBeFalse();
  });

  // ─────────────────────────────
  it('should validate form when correct data is provided', () => {
    component.auditorForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: '123456',
      auditLevel: 'HIGH',
      isActive: true,
    });

    expect(component.auditorForm.valid).toBeTrue();
  });

  // ─────────────────────────────
  it('should generate initials', () => {
    expect(component.getInitials('John', 'Doe')).toBe('JD');
  });

  // ─────────────────────────────
  it('should return ? when names are empty', () => {
    expect(component.getInitials('', '')).toBe('?');
  });

  // ─────────────────────────────
  it('should not submit invalid form', () => {
    component.onSubmit();

    expect(auditorServiceMock.createAuditor).not.toHaveBeenCalled();
  });

  // ─────────────────────────────
  it('should submit form successfully', () => {
    auditorServiceMock.createAuditor.and.returnValue(
      of({
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        auditLevel: 'HIGH',
        isActive: true,
      } as any)
    );

    component.auditorForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: '123456',
      auditLevel: 'HIGH',
      isActive: true,
    });

    component.onSubmit();

    expect(auditorServiceMock.createAuditor).toHaveBeenCalled();
    expect(dialogRefMock.close).toHaveBeenCalledWith(true);
  });

  // ─────────────────────────────
  it('should handle submit error', () => {
    spyOn(window, 'alert');

    auditorServiceMock.createAuditor.and.returnValue(
      throwError(() => new Error('API error'))
    );

    component.auditorForm.patchValue({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      password: '123456',
      auditLevel: 'HIGH',
      isActive: true,
    });

    component.onSubmit();

    expect(window.alert).toHaveBeenCalled();
  });
});