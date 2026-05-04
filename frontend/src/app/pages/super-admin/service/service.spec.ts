import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';

import { ServiceComponent } from './service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

describe('ServiceComponent', () => {
  let component: ServiceComponent;
  let fixture: ComponentFixture<ServiceComponent>;
  let dialogSpy: jasmine.SpyObj<MatDialog>;

  const mockServiceService = {
    getServices: jasmine.createSpy().and.returnValue(of([])),
    createService: jasmine.createSpy().and.returnValue(of({})),
    deleteService: jasmine.createSpy().and.returnValue(of({})),
    updateService: jasmine.createSpy().and.returnValue(of({})),
    activateService: jasmine.createSpy().and.returnValue(of({})),
    deactivateService: jasmine.createSpy().and.returnValue(of({})),
  };

  beforeEach(async () => {
    dialogSpy = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [ServiceComponent, NoopAnimationsModule],
      providers: [
        { provide: ServiceService, useValue: mockServiceService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideProvider(MatDialog, { useValue: dialogSpy })
      .compileComponents();

    fixture = TestBed.createComponent(ServiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });

  it('should load services on init', () => {
    expect(mockServiceService.getServices).toHaveBeenCalled();
  });

  it('should apply filter', () => {
    component.applyFilter({ target: { value: 'cardio' } } as any);
    expect(component.dataSource.filter).toBe('cardio');
  });

  it('should open add dialog', () => {
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.addService();
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should delete service when confirmed', () => {
    const service: any = { _id: '1', name: 'Test Service' };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.deleteService(service);
    expect(mockServiceService.deleteService).toHaveBeenCalledWith('1');
  });

  it('should toggle service status', () => {
    const service: any = { _id: '1', name: 'Test', isActive: true };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.toggleStatus(service);
    expect(mockServiceService.deactivateService).toHaveBeenCalledWith('1');
  });

  it('should open view dialog', () => {
    const service: any = { _id: '1', name: 'Test' };
    dialogSpy.open.and.returnValue({ afterClosed: () => of(null) } as any);
    component.viewService(service);
    expect(dialogSpy.open).toHaveBeenCalled();
  });

  it('should open edit dialog', () => {
    const service: any = { _id: '1', name: 'Test' };
    dialogSpy.open.and.returnValue({ afterClosed: () => of({ name: 'updated' }) } as any);
    component.editService(service);
    expect(dialogSpy.open).toHaveBeenCalled();
  });
});
