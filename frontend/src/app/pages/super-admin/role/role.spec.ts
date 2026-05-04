import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';

import { RoleComponent } from './role';
import { RoleService } from 'src/app/services/superadmin/role.service';

interface RoleRow {
  _id: string; name: string; description?: string;
  permissions: string[]; isArchived?: boolean; usersCount?: number;
}

describe('RoleComponent', () => {
  let component: RoleComponent;
  let fixture: ComponentFixture<RoleComponent>;
  let roleService: jasmine.SpyObj<RoleService>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const createMockRole = (overrides: Partial<RoleRow> = {}): RoleRow => ({
    _id: '1', name: 'admin', description: 'Administrator role',
    permissions: ['read', 'write'], isArchived: false, usersCount: 0, ...overrides,
  });

  const mockRef = (result: any = null) => ({ afterClosed: () => of(result), close: jasmine.createSpy('close') } as any);

  beforeEach(async () => {
    const roleServiceSpy = jasmine.createSpyObj<RoleService>('RoleService', [
      'getRoles', 'getUsersCountByRole', 'archiveRole', 'createRole', 'updateRole', 'getPermissions',
    ]);

    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [RoleComponent, NoopAnimationsModule, ReactiveFormsModule],
      providers: [
        { provide: RoleService, useValue: roleServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideProvider(MatDialog, { useValue: dialogSpy })
      .compileComponents();

    fixture = TestBed.createComponent(RoleComponent);
    component = fixture.componentInstance;
    roleService = TestBed.inject(RoleService) as jasmine.SpyObj<RoleService>;

    roleService.getRoles.and.returnValue(of([]));
    roleService.getUsersCountByRole.and.returnValue(of([]));
    roleService.getPermissions?.and?.returnValue(of([]));
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should initialize dataSource as empty', () => {
    expect(component.dataSource.data).toEqual([]);
    expect(component.loading).toBeFalse();
  });

  it('should load roles and users count on init', fakeAsync(() => {
    roleService.getRoles.and.returnValue(of([
      createMockRole({ _id: '1', name: 'admin', usersCount: 5 }),
      createMockRole({ _id: '2', name: 'user', usersCount: 10 }),
    ] as any));
    roleService.getUsersCountByRole.and.returnValue(of([{ role: 'admin', count: 5 }, { role: 'user', count: 10 }]));
    component.loadData(); tick(); tick(); fixture.detectChanges();
    expect(component.dataSource.data.length).toBe(2);
    expect(component.loading).toBeFalse();
  }));

  it('should filter out archived roles', fakeAsync(() => {
    roleService.getRoles.and.returnValue(of([
      createMockRole({ _id: '1', name: 'admin', isArchived: false }),
      createMockRole({ _id: '2', name: 'old-role', isArchived: true }),
    ] as any));
    roleService.getUsersCountByRole.and.returnValue(of([]));
    component.loadData(); tick(); tick(); fixture.detectChanges();
    expect(component.dataSource.data.length).toBe(1);
    expect(component.dataSource.data[0].name).toBe('admin');
  }));

  it('should handle error when loading roles', fakeAsync(() => {
    roleService.getRoles.and.returnValue(throwError(() => new Error('API Error')));
    spyOn(console, 'error');
    component.loadData(); tick(); fixture.detectChanges();
    expect(component.loading).toBeFalse();
    expect(component.dataSource.data).toEqual([]);
  }));

  it('should apply filter on dataSource', () => {
    component.dataSource.data = [
      createMockRole({ name: 'admin' }) as any,
      createMockRole({ name: 'superuser' }) as any,
    ];
    component.applyFilter({ target: { value: 'admin' } } as any);
    expect(component.dataSource.filter).toBe('admin');
    // filteredData depends on MatTableDataSource filterPredicate
    expect(component.dataSource.filteredData.length).toBeGreaterThanOrEqual(1);
  });

  it('should open RoleViewDialog with role data', () => {
    const role = createMockRole({ _id: '1', name: 'admin' });
    dialogSpy.open.and.returnValue(mockRef());
    component.viewRole(role as any);
    expect(dialogSpy.open).toHaveBeenCalled();
    expect(dialogSpy.open.calls.mostRecent().args[1]?.data).toEqual(role);
  });

  it('should call archiveRole when confirmed', fakeAsync(() => {
    const role = createMockRole({ _id: '1', name: 'admin' });
    dialogSpy.open.and.returnValue(mockRef(true));
    roleService.archiveRole.and.returnValue(of({ success: true } as any));
    spyOn(component, 'loadData').and.callThrough();
    component.archiveRole(role as any); tick(); tick(); fixture.detectChanges();
    expect(roleService.archiveRole).toHaveBeenCalledWith('1');
    expect(component.loadData).toHaveBeenCalled();
  }));

  it('should NOT call archiveRole when cancelled', fakeAsync(() => {
    const role = createMockRole({ _id: '1', name: 'admin' });
    dialogSpy.open.and.returnValue(mockRef(false));
    component.archiveRole(role as any); tick(); fixture.detectChanges();
    expect(roleService.archiveRole).not.toHaveBeenCalled();
  }));

  it('should handle archive error', fakeAsync(() => {
    const role = createMockRole({ _id: '1', name: 'admin' });
    dialogSpy.open.and.returnValue(mockRef(true));
    roleService.archiveRole.and.returnValue(throwError(() => new Error('Failed')));
    spyOn(console, 'error');
    component.archiveRole(role as any); tick(); tick(); fixture.detectChanges();
    expect(console.error).toHaveBeenCalledWith('Archive failed:', jasmine.any(Error));
  }));

  it('should create role and refresh data on success', fakeAsync(() => {
    const newRole = { name: 'new-role', permissions: ['read'] as string[] };
    dialogSpy.open.and.returnValue(mockRef(newRole));
    roleService.createRole.and.returnValue(of({ _id: '3', ...newRole } as any));
    spyOn(component, 'loadData').and.callThrough();
    component.openAddDialog(); tick(); tick(); fixture.detectChanges();
    expect(roleService.createRole).toHaveBeenCalledWith(newRole);
    expect(component.loadData).toHaveBeenCalled();
  }));

  it('should do nothing if add dialog is cancelled', fakeAsync(() => {
    dialogSpy.open.and.returnValue(mockRef(null));
    spyOn(component, 'loadData');
    component.openAddDialog(); tick(); fixture.detectChanges();
    expect(roleService.createRole).not.toHaveBeenCalled();
    expect(component.loadData).not.toHaveBeenCalled();
  }));

  it('should update role and refresh data on success', fakeAsync(() => {
    const role = createMockRole({ _id: '1', name: 'admin' });
    const updatedData = { name: 'administrator', permissions: ['read', 'write', 'delete'] as string[] };
    dialogSpy.open.and.returnValue(mockRef(updatedData));
    roleService.updateRole.and.returnValue(of({ ...role, ...updatedData } as any));
    spyOn(component, 'loadData').and.callThrough();
    component.openEditDialog(role as any); tick(); tick(); fixture.detectChanges();
    expect(roleService.updateRole).toHaveBeenCalledWith('1', updatedData);
    expect(component.loadData).toHaveBeenCalled();
  }));
});
