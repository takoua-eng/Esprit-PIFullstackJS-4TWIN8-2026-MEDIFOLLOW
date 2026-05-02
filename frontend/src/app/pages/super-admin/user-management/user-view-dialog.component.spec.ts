import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserViewDialog } from './user-view-dialog';

describe('UserViewDialog', () => {
  let component: UserViewDialog;
  let fixture: ComponentFixture<UserViewDialog>;

  const mockUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    role: { name: 'doctor' },
    serviceId: { name: 'Cardiology' },
    isActive: true,
    isArchived: false,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserViewDialog],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: mockUser },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserViewDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return full name', () => {
    expect(component.fullName).toBe('John Doe');
  });

  it('should return role name lowercase', () => {
    expect(component.roleName).toBe('doctor');
  });

  it('should return service name', () => {
    expect(component.serviceName).toBe('Cardiology');
  });
});