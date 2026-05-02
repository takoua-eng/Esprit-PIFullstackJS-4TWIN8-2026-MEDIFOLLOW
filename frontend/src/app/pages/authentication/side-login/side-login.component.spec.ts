import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AppSideLoginComponent } from './side-login.component';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { CoreService } from 'src/app/services/core.service';
import { FaceRecognitionService } from 'src/app/services/face-recognition';
import { API_BASE_URL } from 'src/app/core/api.config';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser';

describe('AppSideLoginComponent', () => {
  let component: AppSideLoginComponent;
  let fixture: ComponentFixture<AppSideLoginComponent>;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;
  let coreServiceSpy: jasmine.SpyObj<CoreService>;
  let faceServiceSpy: jasmine.SpyObj<FaceRecognitionService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl']);
    coreServiceSpy = jasmine.createSpyObj('CoreService', ['setUserFromLogin', 'setPermissions']);
    faceServiceSpy = jasmine.createSpyObj('FaceRecognitionService', ['loadModels', 'detectFace']);

    // Resolve loadModels immediately
    faceServiceSpy.loadModels.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [
        AppSideLoginComponent,
        HttpClientTestingModule,
        ReactiveFormsModule,
        BrowserAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: CoreService, useValue: coreServiceSpy },
        { provide: FaceRecognitionService, useValue: faceServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .overrideComponent(AppSideLoginComponent, {
      remove: { imports: [HttpClientModule, RouterModule] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppSideLoginComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges(); // triggers ngOnInit
  });

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should create and call loadModels on init', () => {
    expect(component).toBeTruthy();
    expect(faceServiceSpy.loadModels).toHaveBeenCalled();
  });

  describe('Classic Login', () => {
    it('should not submit if form is invalid', () => {
      component.form.setValue({ email: '', password: '', remember: false });
      component.submit();
      expect(component.form.touched).toBeTrue();
      expect(component.loading).toBeFalse();
    });

    it('should submit successfully and navigate', () => {
      component.form.setValue({ email: 'admin@example.com', password: 'password', remember: false });
      component.submit();

      expect(component.loading).toBeTrue();

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
      expect(req.request.method).toBe('POST');
      req.flush({
        accessToken: 'fake-token',
        role: 'ADMIN',
        user: { id: 1, name: 'Admin' },
        permissions: ['READ', 'WRITE']
      });

      expect(component.loading).toBeFalse();
      expect(localStorage.getItem('accessToken')).toBe('fake-token');
      expect(coreServiceSpy.setUserFromLogin).toHaveBeenCalledWith({ id: 1, name: 'Admin' });
      expect(coreServiceSpy.setPermissions).toHaveBeenCalledWith(['READ', 'WRITE']);
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard/admin');
    });

    it('should handle login error', () => {
      component.form.setValue({ email: 'admin@example.com', password: 'wrong', remember: false });
      component.submit();

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
      req.flush({ message: 'Invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toBe('Invalid credentials');
    });
  });

  describe('Face ID Login', () => {
    it('should start face login and show camera', fakeAsync(() => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve({} as MediaStream));
      component.video = { nativeElement: { srcObject: null } } as any;

      component.startFaceLogin();
      tick();

      expect(component.showCamera).toBeTrue();
      expect(component.faceMessage).toBe('⏳ Initializing camera...');
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true });
    }));

    it('should handle capture and login success', fakeAsync(() => {
      // Mock detectFace to return a dummy descriptor
      const dummyResult = { descriptor: new Float32Array([0.1, 0.2, 0.3]) };
      faceServiceSpy.detectFace.and.returnValue(Promise.resolve(dummyResult as any));
      component.video = { nativeElement: {} } as any;

      component.captureAndLogin();
      tick();

      const req = httpMock.expectOne(`${API_BASE_URL}/auth/face-login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ faceDescriptor: [0.10000000149011612, 0.20000000298023224, 0.30000001192092896] });

      req.flush({
        token: 'face-token',
        role: 'NURSE',
        user: { id: 2, name: 'Nurse' }
      });

      expect(component.loadingFace).toBeFalse();
      expect(component.faceMessage).toBe('🎉 Login success');
      expect(localStorage.getItem('accessToken')).toBe('face-token');
      expect(coreServiceSpy.setUserFromLogin).toHaveBeenCalledWith({ id: 2, name: 'Nurse' });
      expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/dashboard/nurse');
    }));
  });

  describe('WebAuthn (loginWithFaceID)', () => {
    it('should catch error when WebAuthn flow fails', fakeAsync(() => {
      component.form.patchValue({ email: 'test@example.com' });

      // We cannot easily spy on SimpleWebAuthnBrowser.startAuthentication because it's an ES module.
      // We will let it fail naturally (since options will be empty/invalid) and verify the catch block.
      component.loginWithFaceID();

      // 1. challenge request
      const reqChallenge = httpMock.expectOne(`${API_BASE_URL}/auth/webauthn/login-challenge?email=test%40example.com`);
      expect(reqChallenge.request.method).toBe('GET');
      reqChallenge.flush({ challenge: 'random-string' });

      tick();

      // The catch block should execute because startAuthentication fails in a test env
      expect(component.loading).toBeFalse();
      expect(component.errorMessage).toBe('Face ID login failed');
    }));

    it('should show error if email is missing for WebAuthn', () => {
      component.form.patchValue({ email: '' });
      component.loginWithFaceID();
      expect(component.errorMessage).toBe('Enter your email first.');
    });
  });
});
