import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { EditAdminDialog } from './edit-admin';
import { AdminService } from 'src/app/services/superadmin/admin.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

describe('EditAdminDialog', () => {
  let component: EditAdminDialog;
  let fixture: ComponentFixture<EditAdminDialog>;

  const mockAdmin = {
    _id: '1',
    firstName: 'Ali',
    lastName: 'Ben',
    email: 'ali@test.com',
    phone: '22123456',
    isActive: true,
    isArchived: false,
  };

  const mockAdminService = {
    updateAdmin: jasmine.createSpy('updateAdmin').and.returnValue(of({})),
  };

  const mockServiceService = {
    getServices: jasmine.createSpy('getServices').and.returnValue(of([])),
  };

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditAdminDialog, NoopAnimationsModule, ReactiveFormsModule],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
        { provide: ServiceService, useValue: mockServiceService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockAdmin },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditAdminDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with admin data', () => {
    expect(component.adminForm.get('firstName')?.value).toBe('Ali');
    expect(component.adminForm.get('email')?.value).toBe('ali@test.com');
  });

  it('should return correct initials', () => {
    expect(component.getInitials('A', 'B')).toBe('AB');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });
});