import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NursesComponent } from './nurses';
import { NurseService } from 'src/app/services/admin/nurse.service';
import { ServiceService } from 'src/app/services/admin/service.service';
import { CoreService } from 'src/app/services/core.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('NursesComponent', () => {
  let component: NursesComponent;
  let fixture: ComponentFixture<NursesComponent>;
  let mockDialog: any;

  const mockNurseService = {
    getNurses: jasmine.createSpy('getNurses').and.returnValue(of([
      { _id: '1', firstName: 'Sarah', lastName: 'Connor', isArchived: false, isActive: true, serviceId: 's1' },
      { _id: '2', firstName: 'T', lastName: '1000', isArchived: true, isActive: true, serviceId: 's2' } // should be filtered out
    ])),
    archiveNurse: jasmine.createSpy('archiveNurse').and.returnValue(of({})),
    activateNurse: jasmine.createSpy('activateNurse').and.returnValue(of({})),
    deactivateNurse: jasmine.createSpy('deactivateNurse').and.returnValue(of({})),
    getNurseById: jasmine.createSpy('getNurseById').and.returnValue(of({
      _id: '1', firstName: 'Sarah', lastName: 'Connor'
    }))
  };

  const mockServiceService = {
    getServices: jasmine.createSpy('getServices').and.returnValue(of([
      { _id: 's1', name: 'Emergency' },
      { _id: 's2', name: 'Pediatrics' }
    ]))
  };

  const mockCoreService = {
    // mock any necessary core service methods here
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
        NursesComponent,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: NurseService, useValue: mockNurseService },
        { provide: ServiceService, useValue: mockServiceService },
        { provide: CoreService, useValue: mockCoreService },
        { provide: MatDialog, useValue: mockDialog }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    mockNurseService.getNurses.calls.reset();
    mockNurseService.archiveNurse.calls.reset();
    mockNurseService.activateNurse.calls.reset();
    mockNurseService.deactivateNurse.calls.reset();
    mockNurseService.getNurseById.calls.reset();
    mockServiceService.getServices.calls.reset();

    fixture = TestBed.createComponent(NursesComponent);
    component = fixture.componentInstance;

    (component as any).dialog = mockDialog;

    fixture.detectChanges(); // calls ngOnInit
  });

  it('should create and load active nurses and services on init', () => {
    expect(component).toBeTruthy();
    expect(mockServiceService.getServices).toHaveBeenCalled();
    expect(mockNurseService.getNurses).toHaveBeenCalled();
    
    // One nurse should be archived and thus filtered out
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].firstName).toBe('Sarah');
    // Service should be populated
    expect(component.dataSource.data[0].service?.name).toBe('Emergency');
  });

  it('should filter nurses properly', () => {
    component.dataSource.data = [
      { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', service: { _id: 's1', name: 'Emergency' } } as any,
      { _id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', service: { _id: 's2', name: 'Surgery' } } as any
    ];

    const predicate = component.dataSource.filterPredicate;
    expect(predicate(component.dataSource.data[0], 'john')).toBeTrue();
    expect(predicate(component.dataSource.data[1], 'john')).toBeFalse();
    expect(predicate(component.dataSource.data[1], 'surgery')).toBeTrue();
  });

  it('should open AddNurse dialog on addNurse and reload on success', () => {
    mockNurseService.getNurses.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    component.addNurse();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockNurseService.getNurses).toHaveBeenCalled();
  });

  it('should archive nurse after confirmation', () => {
    mockNurseService.getNurses.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    const nurse = component.dataSource.data[0];
    component.archiveNurse(nurse as any);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockNurseService.archiveNurse).toHaveBeenCalledWith('1');
    expect(mockNurseService.getNurses).toHaveBeenCalled();
  });

  it('should toggle status of nurse and confirm first', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });
    
    const row = { _id: '1', isActive: true, firstName: 'A', lastName: 'B' } as any;

    component.toggleStatus(row);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockNurseService.deactivateNurse).toHaveBeenCalledWith('1');

    // Reset and test activation
    mockDialog.open.calls.reset();
    const rowInactive = { _id: '2', isActive: false, firstName: 'C', lastName: 'D' } as any;
    component.toggleStatus(rowInactive);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockNurseService.activateNurse).toHaveBeenCalledWith('2');
  });

  it('should edit nurse', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    // We pass a row that is NOT in component.nursesData so it triggers getNurseById
    component.editNurse({ _id: '99' } as any);

    expect(mockNurseService.getNurseById).toHaveBeenCalledWith('99');
    expect(mockDialog.open).toHaveBeenCalled();
  });
  
  it('should get service name correctly', () => {
    const serviceName = component.getServiceName({ name: 'Cardio' });
    expect(serviceName).toBe('Cardio');
    
    const serviceNameEmpty = component.getServiceName(null);
    expect(serviceNameEmpty).toBe('-');
    
    const serviceNameById = component.getServiceNameById('s1');
    expect(serviceNameById).toBe('Emergency'); // It is in the mocked loaded services list
  });
});
