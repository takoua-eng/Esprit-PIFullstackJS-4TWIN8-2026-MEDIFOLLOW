import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ForgotPasswordComponent } from './forgot-password.component';
import { HttpClientModule } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  const backendUrl = `${environment.apiUrl}/auth`;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [
        ForgotPasswordComponent,
        HttpClientTestingModule,
        BrowserAnimationsModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(ForgotPasswordComponent, {
      remove: { imports: [HttpClientModule] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify(); // ✅ Vérifie qu'aucune requête HTTP non attendue n'est en attente
  });

  // ─── CRÉATION ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize at step 1', () => {
    expect(component.step).toBe(1);
    expect(component.isLoading).toBeFalse();
    expect(component.message).toBe('');
  });

  // ─── FORGOTFORM VALIDATIONS ──────────────────────────────────────────────────

  it('should have forgotForm invalid when empty', () => {
    expect(component.forgotForm.valid).toBeFalse();
  });

  it('should have forgotForm invalid with bad email format', () => {
    component.forgotForm.setValue({ email: 'not-an-email' });
    expect(component.forgotForm.valid).toBeFalse();
    expect(component.forgotForm.get('email')?.errors?.['email']).toBeTrue();
  });

  it('should have forgotForm valid with correct email', () => {
    component.forgotForm.setValue({ email: 'test@example.com' });
    expect(component.forgotForm.valid).toBeTrue();
  });

  // ─── RESETFORM VALIDATIONS ───────────────────────────────────────────────────

  it('should have resetForm invalid when empty', () => {
    expect(component.resetForm.valid).toBeFalse();
  });

  it('should have resetForm invalid with short code', () => {
    component.resetForm.setValue({ code: '12', newPassword: 'password123' });
    expect(component.resetForm.valid).toBeFalse();
    expect(component.resetForm.get('code')?.errors?.['minlength']).toBeTruthy();
  });

  it('should have resetForm invalid with short password', () => {
    component.resetForm.setValue({ code: '1234', newPassword: '123' });
    expect(component.resetForm.valid).toBeFalse();
    expect(component.resetForm.get('newPassword')?.errors?.['minlength']).toBeTruthy();
  });

  it('should have resetForm valid with correct values', () => {
    component.resetForm.setValue({ code: '123456', newPassword: 'securePass' });
    expect(component.resetForm.valid).toBeTrue();
  });

  // ─── SUBMIT (step 1) ─────────────────────────────────────────────────────────

  it('should not call HTTP if forgotForm is invalid', () => {
    component.forgotForm.setValue({ email: '' });
    component.submit();
    httpMock.expectNone(`${backendUrl}/forgot-password`);
  });

  it('should call POST /forgot-password and go to step 2 on success', () => {
    component.forgotForm.setValue({ email: 'test@example.com' });
    component.submit();

    expect(component.isLoading).toBeTrue();

    const req = httpMock.expectOne(`${backendUrl}/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'test@example.com' });

    req.flush({ success: true, message: 'Email sent' });

    expect(component.isLoading).toBeFalse();
    expect(component.step).toBe(2);
    expect(component.message).toBe('');
    expect(component.userEmail).toBe('test@example.com');
  });

  it('should show error message if /forgot-password fails', () => {
    component.forgotForm.setValue({ email: 'test@example.com' });
    component.submit();

    const req = httpMock.expectOne(`${backendUrl}/forgot-password`);
    req.flush(
      { message: 'User not found' },
      { status: 404, statusText: 'Not Found' }
    );

    expect(component.isLoading).toBeFalse();
    expect(component.step).toBe(1); // reste à l'étape 1
    expect(component.message).toBe('User not found');
  });

  it('should show fallback error if /forgot-password fails with no message', () => {
    component.forgotForm.setValue({ email: 'test@example.com' });
    component.submit();

    const req = httpMock.expectOne(`${backendUrl}/forgot-password`);
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(component.message).toBe('Something went wrong.');
  });

  // ─── SUBMIT RESET (step 2) ───────────────────────────────────────────────────

  it('should not call HTTP if resetForm is invalid', () => {
    component.resetForm.setValue({ code: '', newPassword: '' });
    component.submitReset();
    httpMock.expectNone(`${backendUrl}/reset-password`);
  });

  it('should call POST /reset-password and redirect on success', fakeAsync(() => {
    component.resetForm.setValue({ code: '123456', newPassword: 'newSecurePass' });
    component.submitReset();

    expect(component.isLoading).toBeTrue();

    const req = httpMock.expectOne(`${backendUrl}/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: '123456', newPassword: 'newSecurePass' });

    req.flush({ message: 'Password reset successfully' });

    expect(component.isLoading).toBeFalse();
    expect(component.message).toBe('Password reset successfully! Redirecting...');

    tick(2000); // ✅ simule le setTimeout de 2 secondes

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/authentication/login']);
  }));

  it('should show error message if /reset-password fails', () => {
    component.resetForm.setValue({ code: '123456', newPassword: 'newSecurePass' });
    component.submitReset();

    const req = httpMock.expectOne(`${backendUrl}/reset-password`);
    req.flush(
      { message: 'Invalid code' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(component.isLoading).toBeFalse();
    expect(component.message).toBe('Invalid code');
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should show fallback error if /reset-password fails with no message', () => {
    component.resetForm.setValue({ code: '123456', newPassword: 'newSecurePass' });
    component.submitReset();

    const req = httpMock.expectOne(`${backendUrl}/reset-password`);
    req.flush({}, { status: 500, statusText: 'Server Error' });

    expect(component.message).toBe('Invalid code or something went wrong.');
  });
});