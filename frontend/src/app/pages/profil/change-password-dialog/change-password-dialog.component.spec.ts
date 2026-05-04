import { TABLER_TEST_PROVIDERS } from 'src/app/testing/tabler-test-providers';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangePasswordDialogComponent } from './change-password-dialog.component';
import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ChangePasswordDialogComponent', () => {
  let component: ChangePasswordDialogComponent;
  let fixture: ComponentFixture<ChangePasswordDialogComponent>;
  let httpMock: HttpTestingController;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ChangePasswordDialogComponent>>;

  const mockDialogData = { email: 'test@example.com' };
  const backendUrl = '${environment.apiUrl}/auth';

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        ChangePasswordDialogComponent,
        HttpClientTestingModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        TranslateModule.forRoot(),
        MatDialogModule
      ],
      providers: [
        ...TABLER_TEST_PROVIDERS,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(ChangePasswordDialogComponent, {
      remove: { imports: [HttpClientModule] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChangePasswordDialogComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    
    // Call detectChanges to trigger ngOnInit
    fixture.detectChanges(); 
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should create and automatically send verification code on init', () => {
    expect(component).toBeTruthy();
    expect(component.isSendingEmail).toBeTrue();
    expect(component.message).toBe('Envoi du code en cours...');

    const req = httpMock.expectOne(`${backendUrl}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com' });

    req.flush({ success: true, message: 'Code sent' });

    expect(component.isSendingEmail).toBeFalse();
    expect(component.isError).toBeFalse();
    expect(component.message).toBe('Un code de vérification a été envoyé à votre email.');
  });

  it('should handle error when sending verification code', () => {
    const req = httpMock.expectOne(`${backendUrl}/forgot-password`);
    req.flush({ message: 'User not found' }, { status: 404, statusText: 'Not Found' });

    expect(component.isSendingEmail).toBeFalse();
    expect(component.isError).toBeTrue();
    expect(component.message).toBe('User not found');
  });

  describe('Form Validation & Submission', () => {
    beforeEach(() => {
      // Flush the initial forgot-password request from ngOnInit
      const req = httpMock.expectOne(`${backendUrl}/forgot-password`);
      req.flush({ success: true });
    });

    it('should have invalid form initially', () => {
      expect(component.form.valid).toBeFalse();
    });

    it('should show error if passwords do not match', () => {
      component.form.setValue({
        code: '123456',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'differentPassword'
      });
      
      expect(component.form.valid).toBeFalse();
      expect(component.form.get('confirmPassword')?.hasError('passwordMismatch')).toBeTrue();
    });

    it('should have valid form when fields are correct', () => {
      component.form.setValue({
        code: '123456',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      });
      
      expect(component.form.valid).toBeTrue();
      expect(component.form.get('confirmPassword')?.hasError('passwordMismatch')).toBeFalse();
    });

    it('should not submit if form is invalid', () => {
      component.form.setValue({ code: '', currentPassword: '', newPassword: '', confirmPassword: '' });
      component.submit();
      
      httpMock.expectNone(`${backendUrl}/change-password`);
      expect(component.isLoading).toBeFalse();
    });

    it('should submit successfully and close dialog', fakeAsync(() => {
      component.form.setValue({
        code: '123456',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      });

      component.submit();

      expect(component.isLoading).toBeTrue();

      const req = httpMock.expectOne(`${backendUrl}/change-password`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        email: 'test@example.com',
        token: '123456',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123'
      });

      req.flush({ message: 'Success' });

      expect(component.isLoading).toBeFalse();
      expect(component.isError).toBeFalse();
      expect(component.message).toBe('Mot de passe modifié avec succès !');

      tick(1500); // Wait for setTimeout

      expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    }));

    it('should handle submission error', () => {
      component.form.setValue({
        code: '123456',
        currentPassword: 'oldPassword',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123'
      });

      component.submit();

      const req = httpMock.expectOne(`${backendUrl}/change-password`);
      req.flush({ message: 'Invalid token' }, { status: 400, statusText: 'Bad Request' });

      expect(component.isLoading).toBeFalse();
      expect(component.isError).toBeTrue();
      expect(component.message).toBe('Invalid token');
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });
  });

  it('should close dialog when close() is called', () => {
    // Flush the initial request from ngOnInit
    httpMock.expectOne(`${backendUrl}/forgot-password`).flush({ success: true });
    
    component.close();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });
});
