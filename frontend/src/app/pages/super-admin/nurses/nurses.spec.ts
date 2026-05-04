import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';

import { NursesComponent } from './nurses';
import { NurseService } from 'src/app/services/superadmin/nurse.service';
import { CoreService } from 'src/app/services/core.service';

describe('NursesComponent', () => {
  let component: NursesComponent;
  let fixture: ComponentFixture<NursesComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockNurseService = {
    getNurses: jasmine.createSpy().and.returnValue(of([])),
    getNurseById: jasmine.createSpy().and.returnValue(of({})),
    activateNurse: jasmine.createSpy().and.returnValue(of({})),
    deactivateNurse: jasmine.createSpy().and.returnValue(of({})),
    archiveNurse: jasmine.createSpy().and.returnValue(of({})),
  };

  const mockCore = {
    hasPermission: jasmine.createSpy().and.returnValue(true),
    getPermissions: jasmine.createSpy().and.returnValue(['*']),
  };

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    await TestBed.configureTestingModule({
      imports: [NursesComponent, NoopAnimationsModule, MatDialogModule, TranslateModule.forRoot()],
      providers: [
        { provide: NurseService, useValue: mockNurseService },
        { provide: CoreService, useValue: mockCore },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideProvider(MatDialog, { useValue: dialogSpy })
      .compileComponents();

    fixture = TestBed.createComponent(NursesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should load nurses on init', () => {
    expect(mockNurseService.getNurses).toHaveBeenCalled();
  });

  it('should apply filter', () => {
    component.applyFilter({ target: { value: 'ali' } } as any);
    expect(component.dataSource.filter).toBe('ali');
  });

  it('should return initials', () => {
    expect(component.getInitials('Ali Ben')).toBe('AB');
    expect(component.getInitials('A')).toBe('A');
    expect(component.getInitials('')).toBe('?');
  });

  it('should open add nurse dialog', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.addUser();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should archive nurse after confirmation', () => {
    const nurse: any = { _id: '1', name: 'Ali Ben', isActive: true };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.archiveNurse(nurse);
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(mockNurseService.archiveNurse).toHaveBeenCalledWith('1');
  });

  it('should toggle nurse status', () => {
    const nurse: any = { _id: '1', name: 'Ali Ben', isActive: true };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.toggleStatus(nurse);
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(mockNurseService.deactivateNurse).toHaveBeenCalledWith('1');
  });
});
