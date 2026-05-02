import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  const mockData: ConfirmDialogData = {
    title: 'Delete User',
    message: 'Are you sure you want to delete this user?',
    confirmLabel: 'Delete',
    confirmColor: 'warn',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ✅ 1. creation
  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  // ✅ 2. data binding
  it('should receive dialog data correctly', () => {
    expect(component.data.title).toBe('Delete User');
    expect(component.data.message).toBe('Are you sure you want to delete this user?');
  });

  // ✅ 3. cancel button
  it('should close dialog with false when cancel clicked', () => {
    component.dialogRef.close(false);
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  // ✅ 4. confirm button
  it('should close dialog with true when confirm clicked', () => {
    component.dialogRef.close(true);
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });
});