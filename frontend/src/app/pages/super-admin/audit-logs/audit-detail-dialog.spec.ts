import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AuditDetailDialog } from './audit-detail-dialog';

describe('AuditDetailDialog', () => {
  let component: AuditDetailDialog;
  let fixture: ComponentFixture<AuditDetailDialog>;

  const mockDialogRef = {
    close: jasmine.createSpy('close'),
  };

  const mockData = {
    userEmail: 'test@mail.com',
    userName: 'Test User',
    userRole: 'admin',
    userId: '123',
    action: 'UPDATE',
    entityType: 'USER',
    entityId: '1',
    ipAddress: '127.0.0.1',
    userAgent: 'Chrome',
    module: 'users',
    sessionId: 'abc',
    description: 'update user',
    before: { name: 'Ali', age: 20 },
    after: { name: 'Ali Ben', age: 21 },
    createdAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditDetailDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: mockData },
        { provide: MatDialogRef, useValue: mockDialogRef },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditDetailDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should assign injected data to log', () => {
    expect(component.log.userEmail).toBe('test@mail.com');
    expect(component.log.action).toBe('UPDATE');
  });

  it('should close dialog', () => {
    component.close();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should return diff keys correctly', () => {
    const keys = component.diffKeys();
    expect(keys).toContain('name');
    expect(keys).toContain('age');
  });

  it('should detect changed values', () => {
    expect(component.hasChanged('name')).toBeTrue();
    expect(component.hasChanged('age')).toBeTrue();
  });

  it('should format values correctly', () => {
    expect(component.getVal({ name: 'Ali' }, 'name')).toBe('Ali');
    expect(component.getVal(null, 'x')).toBe('—');
  });

  it('should parse user agent', () => {
    expect(component.parseUA('Chrome')).toBe('Chrome');
    expect(component.parseUA('unknown')).toBe('—');
  });

  it('should return action color', () => {
    expect(component.actionColor('CREATE')).toBe('#00b894');
    expect(component.actionColor('UNKNOWN')).toBe('#636e72');
  });

  it('should return action icon', () => {
    expect(component.actionIcon('DELETE')).toBe('trash');
    expect(component.actionIcon('UNKNOWN')).toBe('activity');
  });
});