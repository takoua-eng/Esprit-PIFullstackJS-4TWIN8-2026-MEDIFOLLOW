import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AddPatientDialog } from './add-patient-dialog';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PatientService } from 'src/app/services/admin/patient.service';
import { DoctorService } from 'src/app/services/admin/doctor.service';
import { NurseService } from 'src/app/services/admin/nurse.service';
import { CoordinateurService } from 'src/app/services/admin/coordinateur.service';
import { ServiceService } from 'src/app/services/admin/service.service';
import { of } from 'rxjs';

describe('AddPatientDialog', () => {
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddPatientDialog>>;
  let patientServiceSpy: jasmine.SpyObj<PatientService>;
  let doctorServiceSpy: jasmine.SpyObj<DoctorService>;
  let nurseServiceSpy: jasmine.SpyObj<NurseService>;
  let coordinateurServiceSpy: jasmine.SpyObj<CoordinateurService>;
  let serviceServiceSpy: jasmine.SpyObj<ServiceService>;

  const setupTestBed = async (dialogData: any = {}) => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    patientServiceSpy = jasmine.createSpyObj('PatientService', ['checkEmail', 'createPatient', 'updatePatient']);
    doctorServiceSpy = jasmine.createSpyObj('DoctorService', ['getDoctors']);
    nurseServiceSpy = jasmine.createSpyObj('NurseService', ['getNurses']);
    coordinateurServiceSpy = jasmine.createSpyObj('CoordinateurService', ['getCoordinators']);
    serviceServiceSpy = jasmine.createSpyObj('ServiceService', ['getServices']);

    doctorServiceSpy.getDoctors.and.returnValue(of([{ _id: 'd1', assignedService: 's1' } as any]));
    nurseServiceSpy.getNurses.and.returnValue(of([{ _id: 'n1', assignedService: 's1' } as any]));
    coordinateurServiceSpy.getCoordinators.and.returnValue(of([]));
    serviceServiceSpy.getServices.and.returnValue(of([{ _id: 's1', name: 'Service 1' }]));

    await TestBed.configureTestingModule({
      imports: [
        AddPatientDialog,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: dialogData },
        { provide: PatientService, useValue: patientServiceSpy },
        { provide: DoctorService, useValue: doctorServiceSpy },
        { provide: NurseService, useValue: nurseServiceSpy },
        { provide: CoordinateurService, useValue: coordinateurServiceSpy },
        { provide: ServiceService, useValue: serviceServiceSpy }
      ]
    })
    .overrideComponent(AddPatientDialog, {
      set: {
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy },
          { provide: MAT_DIALOG_DATA, useValue: dialogData }
        ]
      }
    })
    .compileComponents();

    const fixture = TestBed.createComponent(AddPatientDialog);
    const component = fixture.componentInstance;
    return { fixture, component };
  };

  describe('Add Mode', () => {
    let component: AddPatientDialog;
    let fixture: ComponentFixture<AddPatientDialog>;

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
      component.patientForm.controls['firstName'].setValue('');
      component.onSubmit();
      expect(window.alert).toHaveBeenCalledWith('Veuillez remplir tous les champs obligatoires correctement.');
      expect(patientServiceSpy.createPatient).not.toHaveBeenCalled();
    });

    it('should calculate age when dateOfBirth changes', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const dob = new Date(birthYear, today.getMonth(), today.getDate() - 1);
      
      component.patientForm.get('dateOfBirth')?.setValue(dob);
      
      expect(component.patientForm.get('age')?.value).toBe(25);
    });

    it('should check email and create patient when valid in add mode', fakeAsync(() => {
      component.isEditMode = false;
      
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);

      component.patientForm.patchValue({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'Password123!',
        phone: '98765432',
        nationalId: '12345678',
        address: '1234567890 Main St', // minlength 10
        dateOfBirth: dob,
        gender: 'female',
        maritalStatus: 'single',
        emergencyContact: '98765431'
      });

      patientServiceSpy.checkEmail.and.returnValue(of(false));
      patientServiceSpy.createPatient.and.returnValue(of({ _id: '1', success: true } as any));

      component.onSubmit();
      tick();

      expect(patientServiceSpy.checkEmail).toHaveBeenCalledWith('jane@example.com');
      expect(patientServiceSpy.createPatient).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ _id: '1', success: true });
    }));
  });

  describe('Edit Mode', () => {
    let component: AddPatientDialog;
    let fixture: ComponentFixture<AddPatientDialog>;

    beforeEach(async () => {
      const mockData = {
        patient: {
          _id: '1',
          firstName: 'Alice',
          lastName: 'Smith',
          email: 'alice@example.com'
        }
      };
      const setup = await setupTestBed(mockData);
      fixture = setup.fixture;
      component = setup.component;
      fixture.detectChanges();
    });

    it('should initialize edit mode', () => {
      expect(component.isEditMode).toBeTrue();
      expect(component.patientForm.get('firstName')?.value).toBe('Alice');
    });

    it('should update patient', fakeAsync(() => {
      const dob = new Date();
      dob.setFullYear(dob.getFullYear() - 25);

      component.patientForm.patchValue({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        phone: '98765432',
        nationalId: '12345678',
        address: '1234567890 Main St',
        dateOfBirth: dob,
        gender: 'female',
        maritalStatus: 'single',
        emergencyContact: '98765431'
      });

      patientServiceSpy.updatePatient.and.returnValue(of({ _id: '1', success: true } as any));

      component.onSubmit();
      tick();

      expect(patientServiceSpy.updatePatient).toHaveBeenCalled();
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ _id: '1', success: true });
    }));
  });
});
