import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { EditProfileDialogComponent } from './edit-profile-dialog.component';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { UserService } from 'src/app/services/users.service';
import { of, throwError } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('EditProfileDialogComponent', () => {
  let component: EditProfileDialogComponent;
  let fixture: ComponentFixture<EditProfileDialogComponent>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<EditProfileDialogComponent>>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  const mockUser = {
    _id: 'user123',
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    phone: '12345678',
    address: '123 Main St'
  };

  const mockDialogData = {
    user: mockUser,
    currentAvatarUrl: 'http://localhost/avatar.jpg',
    computedInitials: 'JD'
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    userServiceSpy = jasmine.createSpyObj('UserService', ['updateUser']);

    await TestBed.configureTestingModule({
      imports: [
        EditProfileDialogComponent,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        MatDialogModule,
        TablerIconsModule.pick(TablerIcons)
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData },
        { provide: UserService, useValue: userServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(EditProfileDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and initialize form with injected data', () => {
    expect(component).toBeTruthy();
    expect(component.initials).toBe('JD');
    expect(component.imagePreview).toBe('http://localhost/avatar.jpg');
    expect(component.form.value.firstName).toBe('Jane');
    expect(component.form.value.email).toBe('jane@example.com');
  });

  it('should handle missing user data safely', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [
        EditProfileDialogComponent, 
        ReactiveFormsModule, 
        BrowserAnimationsModule, 
        MatDialogModule,
        TablerIconsModule.pick(TablerIcons)
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: { user: null, currentAvatarUrl: null, computedInitials: 'U' } },
        { provide: UserService, useValue: userServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    const emptyFixture = TestBed.createComponent(EditProfileDialogComponent);
    const emptyComponent = emptyFixture.componentInstance;
    emptyFixture.detectChanges();

    expect(emptyComponent.form.value.firstName).toBe('');
    expect(emptyComponent.initials).toBe('U');
  });

  it('should not submit if form is invalid', () => {
    component.form.controls['firstName'].setValue('');
    component.submit();

    expect(userServiceSpy.updateUser).not.toHaveBeenCalled();
    expect(component.isLoading).toBeFalse();
  });

  it('should handle file selection', () => {
    const file = new File(['dummy content'], 'avatar.png', { type: 'image/png' });
    const event = { target: { files: [file] } };

    component.onFileSelected(event);

    expect(component.selectedFile).toBe(file);
    // FileReader is asynchronous, we can't easily check imagePreview immediately without mocking FileReader
  });

  it('should submit successfully without file', fakeAsync(() => {
    component.form.patchValue({ firstName: 'Janet' });
    
    userServiceSpy.updateUser.and.returnValue(of({ success: true, message: 'Updated' } as any));

    component.submit();

    expect(userServiceSpy.updateUser).toHaveBeenCalledWith('user123', jasmine.any(FormData));

    tick(1000); // Wait for setTimeout

    expect(component.isLoading).toBeFalse();
    expect(component.isError).toBeFalse();
    expect(component.message).toBe('Profil mis à jour avec succès !');
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ success: true, message: 'Updated' });
  }));

  it('should submit successfully with file', fakeAsync(() => {
    const file = new File([''], 'test.png', { type: 'image/png' });
    component.selectedFile = file;
    
    userServiceSpy.updateUser.and.returnValue(of({ success: true } as any));

    component.submit();
    
    // Check that formData contains the file
    const callArgs = userServiceSpy.updateUser.calls.mostRecent().args;
    const formData = callArgs[1] as FormData;
    expect(formData.has('file')).toBeTrue();
    
    tick(1000);
  }));

  it('should handle submission error', () => {
    userServiceSpy.updateUser.and.returnValue(throwError(() => ({ error: { message: 'Server Error' } })));

    component.submit();

    expect(component.isLoading).toBeFalse();
    expect(component.isError).toBeTrue();
    expect(component.message).toBe('Server Error');
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('should close dialog when close() is called', () => {
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
