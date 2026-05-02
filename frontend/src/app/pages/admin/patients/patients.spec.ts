import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Patients } from './patients';
import { PatientService } from 'src/app/services/superadmin/patient.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('Patients Component', () => {
  let component: Patients;
  let fixture: ComponentFixture<Patients>;
  let mockDialog: any;

  const mockPatientService = {
    getPatients: jasmine.createSpy('getPatients').and.returnValue(of([
      { _id: '1', firstName: 'John', lastName: 'Doe', isArchived: false, isActive: true },
      { _id: '2', firstName: 'Jane', lastName: 'Smith', isArchived: true, isActive: true }
    ])),
    createPatient: jasmine.createSpy('createPatient').and.returnValue(of({})),
    archivePatient: jasmine.createSpy('archivePatient').and.returnValue(of({})),
    activatePatient: jasmine.createSpy('activatePatient').and.returnValue(of({})),
    deactivatePatient: jasmine.createSpy('deactivatePatient').and.returnValue(of({})),
    getPatientById: jasmine.createSpy('getPatientById').and.returnValue(of({
      _id: '1', firstName: 'John', lastName: 'Doe'
    }))
  };

  beforeEach(async () => {
    // ✅ Recréer le mock à chaque test pour éviter la pollution
    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of(true)
      }),
      // ✅ Ces propriétés sont requises par MatDialog en interne
      openDialogs: [],
      afterOpened: { next: jasmine.createSpy() },
      _getAfterAllClosed: jasmine.createSpy().and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [
        Patients,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: PatientService, useValue: mockPatientService },
        { provide: MatDialog, useValue: mockDialog }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    mockPatientService.getPatients.calls.reset();
    mockPatientService.createPatient.calls.reset();
    mockPatientService.archivePatient.calls.reset();
    mockPatientService.activatePatient.calls.reset();
    mockPatientService.deactivatePatient.calls.reset();
    mockPatientService.getPatientById.calls.reset();

    fixture = TestBed.createComponent(Patients);
    component = fixture.componentInstance;

    // ✅ Injecter le mock dialog directement dans l'instance du composant
    (component as any).dialog = mockDialog;
    (component as any).snackBar = { open: jasmine.createSpy('open') };

    fixture.detectChanges();
  });

  it('should create and load active patients on init', () => {
    expect(component).toBeTruthy();
    expect(mockPatientService.getPatients).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].firstName).toBe('John');
  });

  it('should filter patients properly', () => {
    component.dataSource.data = [
      { _id: '1', firstName: 'Alice', lastName: 'Wonder', email: '', phone: '1234', gender: 'F', photo: '' },
      { _id: '2', firstName: 'Bob', lastName: 'Builder', email: '', phone: '5678', gender: 'M', photo: '' }
    ];

    const predicate = component.dataSource.filterPredicate;
    expect(predicate(component.dataSource.data[0], 'alice')).toBeTrue();
    expect(predicate(component.dataSource.data[1], 'alice')).toBeFalse();
    expect(predicate(component.dataSource.data[1], '5678')).toBeTrue();
  });

  it('should open AddPatientDialog on addUser and reload on success', () => {
    mockPatientService.getPatients.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ firstName: 'New' })
    });

    component.addUser();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockPatientService.createPatient).toHaveBeenCalledWith({ firstName: 'New' });
    expect(mockPatientService.getPatients).toHaveBeenCalled();
  });

  it('should archive patient', () => {
    mockPatientService.getPatients.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    const patient = component.dataSource.data[0];
    component.deletePatient(patient);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockPatientService.archivePatient).toHaveBeenCalledWith('1');
    expect((component as any).snackBar.open).toHaveBeenCalled();
    expect(mockPatientService.getPatients).toHaveBeenCalled();
  });

  it('should toggle status of patient', () => {
    const row = { _id: '1', isActive: true } as any;

    component.toggleStatus(row);
    expect(mockPatientService.deactivatePatient).toHaveBeenCalledWith('1');
    expect(row.isActive).toBeFalse();

    component.toggleStatus(row);
    expect(mockPatientService.activatePatient).toHaveBeenCalledWith('1');
    expect(row.isActive).toBeTrue();
  });

  it('should edit patient', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    component.editPatient({ _id: '1' } as any);

    expect(mockPatientService.getPatientById).toHaveBeenCalledWith('1');
    expect(mockDialog.open).toHaveBeenCalled();
  });
});