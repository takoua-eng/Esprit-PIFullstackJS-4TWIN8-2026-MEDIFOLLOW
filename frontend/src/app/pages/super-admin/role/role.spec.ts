import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { RoleComponent } from './role';
import { RoleService } from 'src/app/services/superadmin/role.service';

describe('RoleComponent', () => {
  let component: RoleComponent;
  let fixture: ComponentFixture<RoleComponent>;

  const mockRoleService = {
    getRoles: jasmine.createSpy().and.returnValue(of([])),
    getUsersCountByRole: jasmine.createSpy().and.returnValue(of([])),
    archiveRole: jasmine.createSpy().and.returnValue(of({})),
    createRole: jasmine.createSpy().and.returnValue(of({})),
    updateRole: jasmine.createSpy().and.returnValue(of({})),
  };

  const mockDialog = {
    open: jasmine.createSpy().and.returnValue({
      afterClosed: () => of(false),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoleComponent, NoopAnimationsModule],
      providers: [
        { provide: RoleService, useValue: mockRoleService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RoleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ─────────────────────────────
  // CREATE
  // ─────────────────────────────
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─────────────────────────────
  // LOAD DATA
  // ─────────────────────────────
  it('should load data on init', () => {
    expect(mockRoleService.getRoles).toHaveBeenCalled();
    expect(mockRoleService.getUsersCountByRole).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // FILTER
  // ─────────────────────────────
  it('should apply filter', () => {
    const event = { target: { value: 'admin' } } as any;

    component.applyFilter(event);

    expect(component.dataSource.filter).toBe('admin');
  });

  // ─────────────────────────────
  // VIEW ROLE
  // ─────────────────────────────
  it('should open view dialog', () => {
    const role: any = { _id: '1', name: 'admin', permissions: [] };

    component.viewRole(role);

    expect(mockDialog.open).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // ARCHIVE ROLE
  // ─────────────────────────────
  it('should call archiveRole when confirmed', () => {
    const role: any = { _id: '1', name: 'admin' };

    // force confirm = true
    mockDialog.open.and.returnValue({
      afterClosed: () => of(true),
    });

    component.archiveRole(role);

    expect(mockRoleService.archiveRole).toHaveBeenCalledWith('1');
  });

  // ─────────────────────────────
  // OPEN ADD
  // ─────────────────────────────
  it('should open add dialog', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ name: 'test' }),
    });

    component.openAddDialog();

    expect(mockDialog.open).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // OPEN EDIT
  // ─────────────────────────────
  it('should open edit dialog', () => {
    const role: any = { _id: '1', name: 'admin' };

    mockDialog.open.and.returnValue({
      afterClosed: () => of({ name: 'updated' }),
    });

    component.openEditDialog(role);

    expect(mockDialog.open).toHaveBeenCalled();
  });
});