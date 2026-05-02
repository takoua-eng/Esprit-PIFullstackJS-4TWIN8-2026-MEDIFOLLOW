import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AddDoctorDialog } from './add-medecin-dialog';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { DoctorService } from 'src/app/services/admin/doctor.service';
import { ServiceService } from 'src/app/services/admin/service.service';
import { of } from 'rxjs';

describe('AddDoctorDialog', () => {
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddDoctorDialog>>;
  let doctorServiceSpy: jasmine.SpyObj<DoctorService>;
  let serviceServiceSpy: jasmine.SpyObj<ServiceService>;

  const setupTestBed = async (dialogData: any = {}) => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    doctorServiceSpy = jasmine.createSpyObj('DoctorService', ['checkEmail', 'createDoctor', 'updateDoctor']);
    serviceServiceSpy = jasmine.createSpyObj('ServiceService', ['getServices']);

    serviceServiceSpy.getServices.and.returnValue(of([{ _id: '1', name: 'Service 1' }]));

    await TestBed.configureTestingModule({
      imports: [
        AddDoctorDialog,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: DoctorService, useValue: doctorServiceSpy },
        { provide: ServiceService, useValue: serviceServiceSpy }
      ]
    })
    .overrideComponent(AddDoctorDialog, {
      set: {
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MAT_DIALOG_DATA, useValue: dialogData }
        ]
      }
    })
    .compileComponents();

    const fixture = TestBed.createComponent(AddDoctorDialog);
    const component = fixture.componentInstance;
    return { fixture, component };
  };

  describe('Add Mode', () => {
    let component: AddDoctorDialog;
    let fixture: ComponentFixture<AddDoctorDialog>;

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
      component.doctorForm.controls['firstName'].setValue('');
      component.onSubmit();
      expect(window.alert).toHaveBeenCalledWith('Veuillez remplir tous les champs obligatoires correctement.');
      expect(doctorServiceSpy.createDoctor).not.toHaveBeenCalled();
    });

    it('should check email and create doctor when valid in add mode', fakeAsync(() => {
      component.isEditMode = false;
      
      component.doctorForm.patchValue({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
        phone: '98765432',
        gender: 'male',
        address: '12345 Main St',
        specialization: 'Cardio',
        yearsOfExperience: 5,
        assignedService: '1'
      });

      doctorServiceSpy.checkEmail.and.returnValue(of(false));
      doctorServiceSpy.createDoctor.and.returnValue(of({ _id: '1', success: true } as any));

      component.onSubmit();
      tick();

      expect(doctorServiceSpy.checkEmail).toHaveBeenCalledWith('john@example.com');
      expect(doctorServiceSpy.createDoctor).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ _id: '1', success: true });
    }));
  });

  describe('Edit Mode', () => {
    let component: AddDoctorDialog;
    let fixture: ComponentFixture<AddDoctorDialog>;

    beforeEach(async () => {
      const mockData = {
        doctor: {
          _id: '1',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com'
        }
      };
      const setup = await setupTestBed(mockData);
      fixture = setup.fixture;
      component = setup.component;
      fixture.detectChanges();
    });

    it('should initialize edit mode', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.doctorForm.get('firstName')?.value).toBe('Jane');
    });

    it('should update doctor', fakeAsync(() => {
      component.doctorForm.patchValue({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        phone: '98765432',
        gender: 'female',
        address: '12345 Main St',
        specialization: 'Cardio',
        yearsOfExperience: 5
      });

      doctorServiceSpy.updateDoctor.and.returnValue(of({ _id: '1', success: true } as any));

      component.onSubmit();
      tick();

      expect(doctorServiceSpy.updateDoctor).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ _id: '1', success: true });
    }));
  });
});
