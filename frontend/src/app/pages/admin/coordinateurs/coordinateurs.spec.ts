import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoordinateursComponent } from './coordinateurs';
import { CoordinateurService } from './../../../services/superadmin/coordinateur.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('CoordinateursComponent', () => {
  let component: CoordinateursComponent;
  let fixture: ComponentFixture<CoordinateursComponent>;
  let mockDialog: any;
  let mockSnackBar: any;

  const mockCoordinateurService = {
    getCoordinators: jasmine.createSpy('getCoordinators').and.returnValue(of([
      { _id: '1', firstName: 'Alice', lastName: 'Coordinator', email: 'alice@test.com', isArchived: false, isActive: true },
      { _id: '2', firstName: 'Bob', lastName: 'Archived', email: 'bob@test.com', isArchived: true, isActive: true } // should be filtered out
    ])),
    getCoordinatorById: jasmine.createSpy('getCoordinatorById').and.returnValue(of({
      _id: '1', firstName: 'Alice', lastName: 'Coordinator'
    })),
    archiveCoordinator: jasmine.createSpy('archiveCoordinator').and.returnValue(of({})),
    activateCoordinator: jasmine.createSpy('activateCoordinator').and.returnValue(of({})),
    deactivateCoordinator: jasmine.createSpy('deactivateCoordinator').and.returnValue(of({}))
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

    mockSnackBar = {
      open: jasmine.createSpy('open')
    };

    await TestBed.configureTestingModule({
      imports: [
        CoordinateursComponent,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: CoordinateurService, useValue: mockCoordinateurService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MatSnackBar, useValue: mockSnackBar }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    mockCoordinateurService.getCoordinators.calls.reset();
    mockCoordinateurService.getCoordinatorById.calls.reset();
    mockCoordinateurService.archiveCoordinator.calls.reset();
    mockCoordinateurService.activateCoordinator.calls.reset();
    mockCoordinateurService.deactivateCoordinator.calls.reset();

    fixture = TestBed.createComponent(CoordinateursComponent);
    component = fixture.componentInstance;
    (component as any).dialog = mockDialog;
    (component as any).snackBar = mockSnackBar;
    fixture.detectChanges(); // calls ngOnInit
  });

  it('should create and load active coordinators on init', () => {
    expect(component).toBeTruthy();
    expect(mockCoordinateurService.getCoordinators).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].firstName).toBe('Alice');
  });

  it('should filter coordinators properly', () => {
    component.dataSource.data = [
      { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { _id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }
    ];

    const predicate = component.dataSource.filterPredicate;
    expect(predicate(component.dataSource.data[0], 'john')).toBeTrue();
    expect(predicate(component.dataSource.data[1], 'john')).toBeFalse();
    expect(predicate(component.dataSource.data[1], 'jane@example.com')).toBeTrue();
  });

  it('should open AddCoordinatorDialog on addCoordinator and reload on success', () => {
    mockCoordinateurService.getCoordinators.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ firstName: 'New' })
    });

    component.addCoordinator();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCoordinateurService.getCoordinators).toHaveBeenCalled();
  });

  it('should edit coordinator', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    component.editCoordinator({ _id: '1' } as any);

    expect(mockCoordinateurService.getCoordinatorById).toHaveBeenCalledWith('1');
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should archive coordinator', () => {
    mockCoordinateurService.getCoordinators.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    const coord = component.dataSource.data[0];
    component.archiveCoordinator(coord);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockCoordinateurService.archiveCoordinator).toHaveBeenCalledWith('1');
    expect(mockSnackBar.open).toHaveBeenCalled();
    expect(mockCoordinateurService.getCoordinators).toHaveBeenCalled();
  });

  it('should toggle status of coordinator', () => {
    const row = { _id: '1', isActive: true } as any;

    component.toggleStatus(row);
    expect(mockCoordinateurService.deactivateCoordinator).toHaveBeenCalledWith('1');
    expect(row.isActive).toBeFalse();

    component.toggleStatus(row);
    expect(mockCoordinateurService.activateCoordinator).toHaveBeenCalledWith('1');
    expect(row.isActive).toBeTrue();
  });
});
