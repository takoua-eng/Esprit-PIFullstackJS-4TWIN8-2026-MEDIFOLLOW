import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedecinsComponent } from './medecins';
import { DoctorService } from 'src/app/services/admin/doctor.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('MedecinsComponent', () => {
  let component: MedecinsComponent;
  let fixture: ComponentFixture<MedecinsComponent>;
  let mockDialog: any;

  const mockDoctorService = {
    getDoctors: jasmine.createSpy('getDoctors').and.returnValue(of([
      { _id: '1', firstName: 'Alice', lastName: 'Smith', isArchived: false, isActive: true },
      { _id: '2', firstName: 'Bob', lastName: 'Jones', isArchived: true, isActive: true } // should be filtered out
    ])),
    archiveDoctor: jasmine.createSpy('archiveDoctor').and.returnValue(of({})),
    activateDoctor: jasmine.createSpy('activateDoctor').and.returnValue(of({})),
    getDoctorById: jasmine.createSpy('getDoctorById').and.returnValue(of({
      _id: '1', firstName: 'Alice', lastName: 'Smith'
    }))
  };

  beforeEach(async () => {
    mockDialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of(true)
      }),
      openDialogs: [],
      afterOpened: { next: jasmine.createSpy() },
      _getAfterAllClosed: jasmine.createSpy().and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [
        MedecinsComponent,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: DoctorService, useValue: mockDoctorService },
        { provide: MatDialog, useValue: mockDialog }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    mockDoctorService.getDoctors.calls.reset();
    mockDoctorService.archiveDoctor.calls.reset();
    mockDoctorService.activateDoctor.calls.reset();
    mockDoctorService.getDoctorById.calls.reset();

    fixture = TestBed.createComponent(MedecinsComponent);
    component = fixture.componentInstance;

    (component as any).dialog = mockDialog;
    (component as any).snackBar = { open: jasmine.createSpy('open') };

    fixture.detectChanges();
  });

  it('should create and load active doctors on init', () => {
    expect(component).toBeTruthy();
    expect(mockDoctorService.getDoctors).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].firstName).toBe('Alice');
  });

  it('should filter doctors properly', () => {
    component.dataSource.data = [
      { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', specialty: 'Cardiology' },
      { _id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', specialty: 'Neurology' }
    ];

    const predicate = component.dataSource.filterPredicate;
    expect(predicate(component.dataSource.data[0], 'john')).toBeTrue();
    expect(predicate(component.dataSource.data[1], 'john')).toBeFalse();
    expect(predicate(component.dataSource.data[1], 'neurology')).toBeTrue();
  });

  it('should open AddDoctorDialog on addDoctor and reload on success', () => {
    mockDoctorService.getDoctors.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ firstName: 'New' })
    });

    component.addDoctor();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockDoctorService.getDoctors).toHaveBeenCalled();
  });

  it('should archive doctor', () => {
    mockDoctorService.getDoctors.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    const doctor = component.dataSource.data[0];
    component.archiveDoctor(doctor as any);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockDoctorService.archiveDoctor).toHaveBeenCalledWith('1');
    expect((component as any).snackBar.open).toHaveBeenCalled();
    expect(mockDoctorService.getDoctors).toHaveBeenCalled();
  });

  it('should toggle status of doctor (deactivate maps to archive in component)', () => {
    const row = { _id: '1', isActive: true } as any;

    component.toggleStatus(row);
    expect(mockDoctorService.archiveDoctor).toHaveBeenCalledWith('1');
    expect(row.isActive).toBeFalse();

    component.toggleStatus(row);
    expect(mockDoctorService.activateDoctor).toHaveBeenCalledWith('1');
    expect(row.isActive).toBeTrue();
  });

  it('should edit doctor', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    component.editDoctor({ _id: '1' } as any);

    expect(mockDoctorService.getDoctorById).toHaveBeenCalledWith('1');
    expect(mockDialog.open).toHaveBeenCalled();
  });
});
