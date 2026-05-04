import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockData: ConfirmDialogData = {
    message: 'Are you sure?',
    title: 'Confirm Action',
    confirmText: 'Yes',
    cancelText: 'No'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialog);
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
  // DATA
  // -------------------
  it('should display injected data', () => {
    expect(component.data.message).toBe('Are you sure?');
    expect(component.data.title).toBe('Confirm Action');
  });

  // -------------------
  // CONFIRM
  // -------------------
  it('should close dialog with true on confirm', () => {
    component.onConfirm();

    expect(mockDialogRef.close).toHaveBeenCalledWith(true);
  });

  // -------------------
  // CANCEL
  // -------------------
  it('should close dialog with false on cancel', () => {
    component.onCancel();

    expect(mockDialogRef.close).toHaveBeenCalledWith(false);
  });

  // -------------------
  // DEFAULT VALUES
  // -------------------
  it('should handle missing optional fields', () => {
    const minimalData: ConfirmDialogData = {
      message: 'Test message'
    };

    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [ConfirmDialog],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: minimalData }
      ]
    }).compileComponents();

    const newFixture = TestBed.createComponent(ConfirmDialog);
    const newComponent = newFixture.componentInstance;
    newFixture.detectChanges();

    expect(newComponent.data.message).toBe('Test message');
    expect(newComponent.data.title).toBeUndefined();
  });
});