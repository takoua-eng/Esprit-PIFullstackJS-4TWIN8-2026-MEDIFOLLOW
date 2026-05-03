import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

import { ServiceComponent } from './service';
import { ServiceService } from 'src/app/services/superadmin/service.service';

describe('ServiceComponent', () => {
  let component: ServiceComponent;
  let fixture: ComponentFixture<ServiceComponent>;

  const mockServiceService = {
    getServices: jasmine.createSpy().and.returnValue(of([])),
    createService: jasmine.createSpy().and.returnValue(of({})),
    deleteService: jasmine.createSpy().and.returnValue(of({})),
    updateService: jasmine.createSpy().and.returnValue(of({})),
    activateService: jasmine.createSpy().and.returnValue(of({})),
    deactivateService: jasmine.createSpy().and.returnValue(of({})),
  };

  const mockDialog = {
    open: jasmine.createSpy().and.returnValue({
      afterClosed: () => of(false),
    }),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServiceComponent, NoopAnimationsModule],
      providers: [
        { provide: ServiceService, useValue: mockServiceService },
        { provide: MatDialog, useValue: mockDialog },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ServiceComponent);
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
  // LOAD SERVICES
  // ─────────────────────────────
  it('should load services on init', () => {
    expect(mockServiceService.getServices).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // FILTER
  // ─────────────────────────────
  it('should apply filter', () => {
    const event = { target: { value: 'cardio' } } as any;

    component.applyFilter(event);

    expect(component.dataSource.filter).toBe('cardio');
  });

  // ─────────────────────────────
  // ADD SERVICE
  // ─────────────────────────────
  it('should open add dialog', () => {
    mockDialog.open.and.returnValue({
      afterClosed: () => of({ name: 'test service' }),
    });

    component.addService();

    expect(mockDialog.open).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // DELETE SERVICE
  // ─────────────────────────────
  it('should delete service when confirmed', () => {
    const service: any = { _id: '1', name: 'Test Service' };

    mockDialog.open.and.returnValue({
      afterClosed: () => of(true),
    });

    component.deleteService(service);

    expect(mockServiceService.deleteService).toHaveBeenCalledWith('1');
  });

  // ─────────────────────────────
  // TOGGLE STATUS
  // ─────────────────────────────
  it('should toggle service status', () => {
    const service: any = { _id: '1', name: 'Test', isActive: true };

    mockDialog.open.and.returnValue({
      afterClosed: () => of(true),
    });

    component.toggleStatus(service);

    expect(mockServiceService.deactivateService).toHaveBeenCalledWith('1');
  });

  // ─────────────────────────────
  // VIEW SERVICE
  // ─────────────────────────────
  it('should open view dialog', () => {
    const service: any = { _id: '1', name: 'Test' };

    component.viewService(service);

    expect(mockDialog.open).toHaveBeenCalled();
  });

  // ─────────────────────────────
  // EDIT SERVICE
  // ─────────────────────────────
  it('should open edit dialog', () => {
    const service: any = { _id: '1', name: 'Test' };

    mockDialog.open.and.returnValue({
      afterClosed: () => of({ name: 'updated' }),
    });

    component.editService(service);

    expect(mockDialog.open).toHaveBeenCalled();
  });
});