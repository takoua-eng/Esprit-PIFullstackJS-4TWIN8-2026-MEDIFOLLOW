import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AddNurse } from './add-nurse';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NurseService } from 'src/app/services/superadmin/nurse.service';
import { ServiceService } from 'src/app/services/superadmin/service.service';
import { of } from 'rxjs';

describe('AddNurse (Super Admin)', () => {
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddNurse>>;
  let nurseServiceSpy: jasmine.SpyObj<NurseService>;
  let serviceServiceSpy: jasmine.SpyObj<ServiceService>;

  const setupTestBed = async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    nurseServiceSpy = jasmine.createSpyObj('NurseService', ['createNurse']);
    serviceServiceSpy = jasmine.createSpyObj('ServiceService', ['getServices']);

    serviceServiceSpy.getServices.and.returnValue(of([{ _id: '1', name: 'Service 1' }]));

    await TestBed.configureTestingModule({
      imports: [
        AddNurse,
        ReactiveFormsModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule,
        MatDialogModule
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: NurseService, useValue: nurseServiceSpy },
        { provide: ServiceService, useValue: serviceServiceSpy }
      ]
    })
    .overrideComponent(AddNurse, {
      set: {
        providers: [
          { provide: MatDialogRef, useValue: dialogRefSpy }
        ]
      }
    })
    .compileComponents();

    const fixture = TestBed.createComponent(AddNurse);
    const component = fixture.componentInstance;
    return { fixture, component };
  };

  let component: AddNurse;
  let fixture: ComponentFixture<AddNurse>;

  beforeEach(async () => {
    const setup = await setupTestBed();
    fixture = setup.fixture;
    component = setup.component;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should not submit if form is invalid', () => {
    component.nurseForm.controls['firstName'].setValue('');
    component.onSubmit();
    expect(nurseServiceSpy.createNurse).not.toHaveBeenCalled();
  });

  it('should create nurse when valid', fakeAsync(() => {
    component.nurseForm.patchValue({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      password: 'password123',
      phone: '98765432',
      nationalId: '12345678',
      address: '123 Main St',
      gender: 'female',
      serviceId: '1'
    });

    nurseServiceSpy.createNurse.and.returnValue(of({ success: true } as any));

    component.onSubmit();
    tick();

    expect(nurseServiceSpy.createNurse).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  }));
});
