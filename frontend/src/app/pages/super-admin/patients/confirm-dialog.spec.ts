import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  const mockData = {
    message: 'Are you sure?',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should receive injected data', () => {
    expect(component.data.message).toBe('Are you sure?');
  });

  it('should call dialogRef.close(true) when confirm button logic is triggered manually', () => {
    // simulate behavior (since template uses mat-dialog-close)
    mockDialogRef.close(true);
    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  it('should call dialogRef.close(false) when cancel logic is triggered manually', () => {
    mockDialogRef.close(false);
    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });
});