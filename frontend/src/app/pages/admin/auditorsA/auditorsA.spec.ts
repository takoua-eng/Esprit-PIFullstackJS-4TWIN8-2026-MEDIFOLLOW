import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditorsAComponent } from './auditorsA';
import { AuditorService } from '../../../services/admin/auditor.service';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { of } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('AuditorsAComponent', () => {
  let component: AuditorsAComponent;
  let fixture: ComponentFixture<AuditorsAComponent>;
  let mockDialog: any;

  const mockAuditorService = {
    getAuditors: jasmine.createSpy('getAuditors').and.returnValue(of([
      { _id: '1', firstName: 'Alice', lastName: 'Auditor', email: 'alice@test.com', isArchived: false, isActive: true },
      { _id: '2', firstName: 'Bob', lastName: 'Archived', email: 'bob@test.com', isArchived: false, isActive: true } // not filtered by API in this component! It doesn't filter isArchived out.
    ])),
    getAuditorById: jasmine.createSpy('getAuditorById').and.returnValue(of({
      _id: '1', firstName: 'Alice', lastName: 'Auditor'
    })),
    archiveAuditor: jasmine.createSpy('archiveAuditor').and.returnValue(of({})), // acts as deactivate
    activateAuditor: jasmine.createSpy('activateAuditor').and.returnValue(of({}))
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

    // Mock global alert since the component uses it
    spyOn(window, 'alert');

    await TestBed.configureTestingModule({
      imports: [
        AuditorsAComponent,
        BrowserAnimationsModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: AuditorService, useValue: mockAuditorService },
        { provide: MatDialog, useValue: mockDialog }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
  });

  beforeEach(() => {
    mockAuditorService.getAuditors.calls.reset();
    mockAuditorService.getAuditorById.calls.reset();
    mockAuditorService.archiveAuditor.calls.reset();
    mockAuditorService.activateAuditor.calls.reset();

    fixture = TestBed.createComponent(AuditorsAComponent);
    component = fixture.componentInstance;
    (component as any).dialog = mockDialog;
    fixture.detectChanges(); // calls ngOnInit
  });

  it('should create and load auditors on init', () => {
    expect(component).toBeTruthy();
    expect(mockAuditorService.getAuditors).toHaveBeenCalled();
    expect(component.dataSource.data.length).toBe(2);
    expect(component.dataSource.data[0].firstName).toBe('Alice');
  });

  it('should filter auditors properly', () => {
    component.dataSource.data = [
      { _id: '1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      { _id: '2', firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' }
    ];

    const predicate = component.dataSource.filterPredicate;
    expect(predicate(component.dataSource.data[0], 'john')).toBeTrue();
    expect(predicate(component.dataSource.data[1], 'john')).toBeFalse();
    expect(predicate(component.dataSource.data[1], 'jane@example.com')).toBeTrue();
  });

  it('should open AddAuditorDialog on addAuditor and reload on success', () => {
    mockAuditorService.getAuditors.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ firstName: 'New' })
    });

    component.addAuditor();

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockAuditorService.getAuditors).toHaveBeenCalled();
  });

  it('should edit auditor', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true)
    });

    component.editAuditor({ _id: '1' } as any);

    expect(mockAuditorService.getAuditorById).toHaveBeenCalledWith('1');
    expect(mockDialog.open).toHaveBeenCalled();
  });

  it('should toggle status of auditor (with confirmation)', () => {
    mockAuditorService.getAuditors.calls.reset();
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true) // simulate user clicking confirm
    });

    const row = { _id: '1', isActive: true, firstName: 'A', lastName: 'B' } as any;

    component.toggleStatus(row);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockAuditorService.archiveAuditor).toHaveBeenCalledWith('1');
    expect(mockAuditorService.getAuditors).toHaveBeenCalled();

    // Test activate
    mockDialog.open.calls.reset();
    const inactiveRow = { _id: '2', isActive: false, firstName: 'C', lastName: 'D' } as any;
    component.toggleStatus(inactiveRow);
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockAuditorService.activateAuditor).toHaveBeenCalledWith('2');
  });
});
