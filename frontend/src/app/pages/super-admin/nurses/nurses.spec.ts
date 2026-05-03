import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { NursesComponent } from './nurses';
import { NurseService } from 'src/app/services/superadmin/nurse.service';
import { CoreService } from 'src/app/services/core.service';

describe('NursesComponent', () => {
  let component: NursesComponent;
  let fixture: ComponentFixture<NursesComponent>;

  const mockNurseService = {
    getNurses: jasmine.createSpy().and.returnValue(of([])),
    getNurseById: jasmine.createSpy().and.returnValue(of({})),
    activateNurse: jasmine.createSpy().and.returnValue(of({})),
    deactivateNurse: jasmine.createSpy().and.returnValue(of({})),
    archiveNurse: jasmine.createSpy().and.returnValue(of({}))
  };

  const mockDialog = {
    open: jasmine.createSpy().and.returnValue({
      afterClosed: () => of(true)
    })
  };

  const mockCore = {
    hasPermission: jasmine.createSpy().and.returnValue(true),
    getPermissions: jasmine.createSpy().and.returnValue(['*'])
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NursesComponent, NoopAnimationsModule],
      providers: [
        { provide: NurseService, useValue: mockNurseService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: CoreService, useValue: mockCore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // -----------------------
  // CREATE
  // -----------------------
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // -----------------------
  // LOAD NURSES
  // -----------------------
  it('should load nurses on init', () => {
    expect(mockNurseService.getNurses).toHaveBeenCalled();
  });

  // -----------------------
  // FILTER
  // -----------------------
  it('should apply filter', () => {
    const event = { target: { value: 'ali' } } as any;
    component.applyFilter(event);

    expect(component.dataSource.filter).toBe('ali');
  });

  // -----------------------
  // INITIALS
  // -----------------------
  it('should return initials', () => {
    expect(component.getInitials('Ali Ben')).toBe('AB');
    expect(component.getInitials('A')).toBe('A');
    expect(component.getInitials('')).toBe('?');
  });

  // -----------------------
  // ADD USER
  // -----------------------
  it('should open add nurse dialog', () => {
    component.addUser();
    expect(mockDialog.open).toHaveBeenCalled();
  });

  // -----------------------
  // ARCHIVE
  // -----------------------
  it('should archive nurse after confirmation', () => {
    const nurse: any = {
      _id: '1',
      name: 'Ali Ben',
      isActive: true
    };

    component.archiveNurse(nurse);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockNurseService.archiveNurse).toHaveBeenCalledWith('1');
  });

  // -----------------------
  // TOGGLE STATUS
  // -----------------------
  it('should toggle nurse status', () => {
    const nurse: any = {
      _id: '1',
      name: 'Ali Ben',
      isActive: true
    };

    component.toggleStatus(nurse);

    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockNurseService.deactivateNurse).toHaveBeenCalledWith('1');
  });
});