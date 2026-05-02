import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProfilComponent } from './profil.component';
import { UserService } from 'src/app/services/users.service';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { NEVER, of, throwError } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ProfilComponent', () => {
  let component: ProfilComponent;
  let fixture: ComponentFixture<ProfilComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    userServiceSpy = jasmine.createSpyObj('UserService', ['getProfile']);
    dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

    userServiceSpy.getProfile.and.returnValue(of({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'ADMIN'
    }));

    await TestBed.configureTestingModule({
      imports: [
        ProfilComponent,
        TranslateModule.forRoot(),
        TablerIconsModule.pick(TablerIcons),
        NoopAnimationsModule
      ],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: MatDialog, useValue: dialogSpy }
      ]
    })
    .overrideComponent(ProfilComponent, {
      remove: { imports: [MatDialogModule] },
      add: { providers: [{ provide: MatDialog, useValue: dialogSpy }] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilComponent);
    component = fixture.componentInstance;
    
    // Clear localStorage before each test
    localStorage.removeItem('medi_follow_user_data');
  });

  afterEach(() => {
    localStorage.removeItem('medi_follow_user_data');
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('loadProfile()', () => {
    it('should load profile from localStorage first if available', () => {
      // Return NEVER so the API doesn't overwrite the local data synchronously
      userServiceSpy.getProfile.and.returnValue(NEVER);
      const localData = { firstName: 'Local', lastName: 'User', role: 'NURSE' };
      localStorage.setItem('medi_follow_user_data', JSON.stringify(localData));

      fixture.detectChanges(); // Triggers ngOnInit -> loadProfile

      expect(component.profile.name).toContain('User Local');
      expect(component.profile.role).toBe('NURSE');
    });

    it('should handle invalid localStorage gracefully', () => {
      spyOn(console, 'error');
      localStorage.setItem('medi_follow_user_data', '{ invalid json');

      fixture.detectChanges();

      expect(console.error).toHaveBeenCalledWith('Erreur parsing localStorage', jasmine.any(Error));
    });

    it('should load profile from API and update localStorage', () => {
      fixture.detectChanges();

      expect(userServiceSpy.getProfile).toHaveBeenCalled();
      expect(component.profile.name).toBe('Doe John');
      expect(component.profile.role).toBe('ADMIN');
      
      const savedData = localStorage.getItem('medi_follow_user_data');
      expect(savedData).toBeTruthy();
      expect(JSON.parse(savedData!).firstName).toBe('John');
    });

    it('should handle API error gracefully', () => {
      spyOn(console, 'error');
      userServiceSpy.getProfile.and.returnValue(throwError(() => new Error('API Error')));

      fixture.detectChanges();

      expect(console.error).toHaveBeenCalledWith('Erreur chargement profil API, utilisation des données locales', jasmine.any(Error));
    });
  });

  describe('updateProfileState() logic', () => {
    it('should format doctor profile with "Dr." prefix', () => {
      userServiceSpy.getProfile.and.returnValue(of({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@doctor.com',
        role: { name: 'Doctor' },
      }));

      fixture.detectChanges();

      expect(component.profile.name).toBe('Dr. Smith Alice');
      expect(component.profile.role).toBe('Doctor');
    });

    it('should format avatar URL correctly (uploads/)', () => {
      userServiceSpy.getProfile.and.returnValue(of({
        photo: 'uploads/avatar.jpg'
      }));
      fixture.detectChanges();
      expect(component.profile.avatar).toBe('http://localhost:3000/uploads/avatar.jpg');
    });

    it('should format avatar URL correctly (raw filename)', () => {
      userServiceSpy.getProfile.and.returnValue(of({
        photo: 'image.jpg'
      }));
      fixture.detectChanges();
      expect(component.profile.avatar).toBe('http://localhost:3000/uploads/image.jpg');
    });

    it('should handle http avatar URL correctly', () => {
      userServiceSpy.getProfile.and.returnValue(of({
        photo: 'https://example.com/avatar.jpg'
      }));
      fixture.detectChanges();
      expect(component.profile.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should compute initials from firstName and lastName', () => {
      userServiceSpy.getProfile.and.returnValue(of({
        firstName: 'Bob',
        lastName: 'Jones'
      }));
      fixture.detectChanges();
      expect(component.profile.initials).toBe('BJ');
    });

    it('should compute initials from email if names are missing', () => {
      userServiceSpy.getProfile.and.returnValue(of({
        email: 'test@mail.com'
      }));
      fixture.detectChanges();
      expect(component.profile.initials).toBe('TE');
    });
  });

  describe('Dialogs', () => {
    it('should open ChangePasswordDialogComponent if email exists', () => {
      fixture.detectChanges(); // load profile
      component.openChangePasswordDialog();
      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.mostRecent().args;
      expect((callArgs[0] as any).name).toBe('ChangePasswordDialogComponent');
      expect((callArgs[1] as any)?.data).toEqual({ email: 'john@example.com' });
    });

    it('should not open ChangePasswordDialogComponent if email is missing', () => {
      userServiceSpy.getProfile.and.returnValue(of({ firstName: 'NoEmail' }));
      fixture.detectChanges();
      component.profile.email = '';
      component.openChangePasswordDialog();
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });

    it('should open EditProfileDialogComponent and reload on close', () => {
      const dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
      dialogRefSpy.afterClosed.and.returnValue(of(true));
      dialogSpy.open.and.returnValue(dialogRefSpy);

      fixture.detectChanges();
      
      // Clear call count to verify reload
      userServiceSpy.getProfile.calls.reset();

      component.openEditProfileDialog();

      expect(dialogSpy.open).toHaveBeenCalled();
      const callArgs = dialogSpy.open.calls.mostRecent().args;
      expect((callArgs[0] as any).name).toBe('EditProfileDialogComponent');
      expect((callArgs[1] as any)?.data.user.firstName).toBe('John');

      // afterClosed emitted true, so it should reload profile
      expect(userServiceSpy.getProfile).toHaveBeenCalled();
    });

    it('should not open EditProfileDialogComponent if rawUserData is null', () => {
      component.rawUserData = null;
      component.openEditProfileDialog();
      expect(dialogSpy.open).not.toHaveBeenCalled();
    });
  });
});
