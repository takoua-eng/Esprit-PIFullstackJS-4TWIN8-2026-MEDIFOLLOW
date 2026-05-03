import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { RoleViewDialog } from './role-view-dialog';

describe('RoleViewDialog', () => {
  let component: RoleViewDialog;
  let fixture: ComponentFixture<RoleViewDialog>;

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  const mockRoleData = {
    name: 'doctor',
    description: 'Role description',
    usersCount: 3,
    permissions: [
      'patients:read',
      'patients:create',
      'vitals:read',
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleViewDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockRoleData },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleViewDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─────────────────────────────
  // CREATE
  // ─────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────
  // DATA RECEIVED
  // ─────────────────────────────
  it('should receive injected data', () => {
    expect(component.data.name).toBe('doctor');
    expect(component.data.usersCount).toBe(3);
  });

  // ─────────────────────────────
  // PERMISSION GROUPING
  // ─────────────────────────────
  it('should build permission groups correctly', () => {
    expect(component.permGroups.length).toBeGreaterThan(0);

    const patientsGroup = component.permGroups.find(
      g => g.domain === 'patients'
    );

    expect(patientsGroup).toBeDefined();
    expect(patientsGroup?.perms.length).toBe(2);
  });

  // ─────────────────────────────
  // CLOSE DIALOG
  // ─────────────────────────────
  it('should close dialog', () => {
    component.dialogRef.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // WILDCARD CASE
  // ─────────────────────────────
  it('should not build groups when permissions is wildcard', () => {
    component.data = { ...mockRoleData, permissions: ['*'] };

    // rebuild manually
    (component as any).buildPermGroups();

    expect(component.permGroups.length).toBe(0);
  });
});