import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AddCoordinatorDialog } from './add-coordinateur-dialog';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CoordinateurService } from 'src/app/services/superadmin/coordinateur.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';
import { of } from 'rxjs';

describe('AddCoordinatorDialog', () => {
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddCoordinatorDialog>>;
  let coordinateurServiceSpy: jasmine.SpyObj<CoordinateurService>;
  let serviceServiceSpy: jasmine.SpyObj<ServiceService>;

  const setupTestBed = async (dialogData: any = {}) => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    coordinateurServiceSpy = jasmine.createSpyObj('CoordinateurService', ['checkEmail', 'createCoordinator', 'updateCoordinator']);
    serviceServiceSpy = jasmine.createSpyObj('ServiceService', ['getServices']);

    serviceServiceSpy.getServices.and.returnValue(of([{ _id: '1', name: 'Service 1' }]));

    await TestBed.configureTestingModule({
      imports: [
        AddCoordinatorDialog,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: CoordinateurService, useValue: coordinateurServiceSpy },
        { provide: ServiceService, useValue: serviceServiceSpy }
      ]
    })
    .overrideComponent(AddCoordinatorDialog, {
      set: {
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MAT_DIALOG_DATA, useValue: dialogData }
        ]
      }
    })
    .compileComponents();

    const fixture = TestBed.createComponent(AddCoordinatorDialog);
    const component = fixture.componentInstance;
    return { fixture, component };
  };

  describe('Default mode (Add Mode)', () => {
    let component: AddCoordinatorDialog;
    let fixture: ComponentFixture<AddCoordinatorDialog>;

    beforeEach(async () => {
      const setup = await setupTestBed({});
      fixture = setup.fixture;
      component = setup.component;
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should close dialog on cancel', () => {
      component.onCancel();
      expect(dialogRefSpy.close).toHaveBeenCalled();
    });

    it('should not submit if form is invalid', () => {
      spyOn(window, 'alert');
      component.coordinatorForm.controls['firstName'].setValue('');
      component.onSubmit();
      expect(window.alert).toHaveBeenCalledWith('Veuillez remplir tous les champs obligatoires correctement.');
      expect(coordinateurServiceSpy.createCoordinator).not.toHaveBeenCalled();
    });

    it('should handle photo selection with valid image', () => {
      const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
      const event = { target: { files: [file] } } as unknown as Event;
      
      const mockReader = jasmine.createSpyObj('FileReader', ['readAsDataURL']);
      spyOn(window, 'FileReader').and.returnValue(mockReader as any);
      
      component.onFileSelected(event);
      
      expect(component.selectedFile).toBe(file);
      expect(mockReader.readAsDataURL).toHaveBeenCalledWith(file);
    });

    it('should reject non-image files', () => {
      spyOn(window, 'alert');
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const event = { target: { files: [file] } } as unknown as Event;
      
      component.onFileSelected(event);
      
      expect(window.alert).toHaveBeenCalledWith('Image invalide');
      expect(component.selectedFile).toBeNull();
    });

    it('should remove photo', () => {
      component.photoPreview = 'some-url.jpg';
      component.selectedFile = new File([''], 'test.png', { type: 'image/png' });
      
      component.removePhoto();
      
      expect(component.photoPreview).toBeNull();
      expect(component.selectedFile).toBeNull();
    });

    it('should check email and create coordinator when valid in add mode', fakeAsync(() => {
      component.isEditMode = false;
      
      component.coordinatorForm.patchValue({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '98765432',
        gender: 'male',
        address: '12345 Main St',
        yearsOfExperience: 5
      });

      coordinateurServiceSpy.checkEmail.and.returnValue(of({ exists: false }));
      coordinateurServiceSpy.createCoordinator.and.returnValue(of({ _id: '1', success: true } as any));

      component.onSubmit();
      tick();

      expect(coordinateurServiceSpy.checkEmail).toHaveBeenCalledWith('john@example.com');
      expect(coordinateurServiceSpy.createCoordinator).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ _id: '1', success: true });
    }));

    it('should alert if email exists in add mode', fakeAsync(() => {
      spyOn(window, 'alert');
      component.isEditMode = false;
      
      component.coordinatorForm.patchValue({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '98765432',
        gender: 'male',
        address: '12345 Main St',
        yearsOfExperience: 5
      });

      coordinateurServiceSpy.checkEmail.and.returnValue(of({ exists: true }));

      component.onSubmit();
      tick();

      expect(coordinateurServiceSpy.checkEmail).toHaveBeenCalledWith('john@example.com');
      expect(window.alert).toHaveBeenCalledWith(`L'email john@example.com est déjà utilisé.`);
      expect(coordinateurServiceSpy.createCoordinator).not.toHaveBeenCalled();
    }));
  });

  describe('Edit mode', () => {
    let component: AddCoordinatorDialog;
    let fixture: ComponentFixture<AddCoordinatorDialog>;

    beforeEach(async () => {
      const mockData = {
        coordinator: {
          _id: '1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
          photo: 'some-url.jpg'
        }
      };
      const setup = await setupTestBed(mockData);
      fixture = setup.fixture;
      component = setup.component;
      fixture.detectChanges();
    });

    it('should initialize edit mode when coordinator data is provided', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.coordinatorForm.get('firstName')?.value).toBe('Jane');
      expect(component.photoPreview).toBe('some-url.jpg');
    });

    it('should update coordinator in edit mode', fakeAsync(() => {
      component.coordinatorForm.patchValue({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '98765432',
        gender: 'female',
        address: '12345 Main St',
        yearsOfExperience: 5
      });

      coordinateurServiceSpy.updateCoordinator.and.returnValue(of({ _id: '1', success: true } as any));

      component.onSubmit();
      tick();

      expect(coordinateurServiceSpy.updateCoordinator).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ _id: '1', success: true });
    }));
  });
});
