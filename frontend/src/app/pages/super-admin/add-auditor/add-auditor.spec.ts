import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { AddAuditorDialog } from './add-auditor';

import {
  AuditorService,
  Auditor,
} from 'src/app/services/superadmin/auditor.service';

import { MatDialogRef } from '@angular/material/dialog';

describe('AddAuditorDialog', () => {
  let component: AddAuditorDialog;
  let fixture: ComponentFixture<AddAuditorDialog>;

  let auditorServiceSpy: jasmine.SpyObj<AuditorService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<AddAuditorDialog>>;

  beforeEach(async () => {
    auditorServiceSpy = jasmine.createSpyObj('AuditorService', [
      'createAuditor',
    ]);

    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        AddAuditorDialog,
        ReactiveFormsModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: AuditorService, useValue: auditorServiceSpy },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddAuditorDialog);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form correctly', () => {
    expect(component.auditorForm).toBeDefined();
    expect(component.auditorForm.get('firstName')?.value).toBe('');
    expect(component.auditorForm.get('email')?.value).toBe('');
    expect(component.auditorForm.get('isActive')?.value).toBeTrue();
  });

  it('should invalidate empty required fields', () => {
    component.auditorForm.patchValue({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    });

    expect(component.auditorForm.invalid).toBeTrue();
  });

  it('should validate email', () => {
    component.auditorForm.patchValue({
      email: 'invalid-email',
    });

    expect(component.auditorForm.get('email')?.invalid).toBeTrue();

    component.auditorForm.patchValue({
      email: 'test@test.com',
    });

    expect(component.auditorForm.get('email')?.valid).toBeTrue();
  });

  it('should return initials correctly', () => {
    expect(component.getInitials('Nada', 'Ben')).toBe('NB');
  });

  it('should return ? for empty names', () => {
    expect(component.getInitials('', '')).toBe('?');
  });

  it('should handle valid image upload', () => {
    const file = new File(['dummy'], 'photo.png', {
      type: 'image/png',
    });

    const event = {
      target: { files: [file] },
    };

    spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function (
      this: FileReader,
    ) {
      if (this.onload) {
        this.onload({
          target: {
            result: 'data:image/png;base64,test',
          },
        } as any);
      }
    });

    component.onFileSelected(event);

    expect(component.selectedFile).toEqual(file);
  });

  it('should ignore invalid file type', () => {
    const file = new File(['dummy'], 'doc.pdf', {
      type: 'application/pdf',
    });

    component.onFileSelected({
      target: { files: [file] },
    });

    expect(component.selectedFile).toBeNull();
  });

  it('should NOT submit invalid form', () => {
    component.auditorForm.patchValue({
      firstName: '',
    });

    component.onSubmit();

    expect(auditorServiceSpy.createAuditor).not.toHaveBeenCalled();
  });

  it('should submit valid form successfully', () => {
    const mockAuditor: Auditor = {
      _id: '1',
      firstName: 'Nada',
      lastName: 'Ben Khaled',
      email: 'nada@test.com',
      isActive: true,
      isArchived: false, // ✅ FIX HERE
    };

    auditorServiceSpy.createAuditor.and.returnValue(of(mockAuditor));

    component.auditorForm.patchValue({
      firstName: 'Nada',
      lastName: 'Ben Khaled',
      email: 'nada@test.com',
      password: '123456',
      isActive: true,
    });

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(auditorServiceSpy.createAuditor).toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('should handle API error', () => {
    spyOn(window, 'alert');

    auditorServiceSpy.createAuditor.and.returnValue(
      throwError(() => ({ message: 'API Error' })),
    );

    component.auditorForm.patchValue({
      firstName: 'Nada',
      lastName: 'Ben Khaled',
      email: 'nada@test.com',
      password: '123456',
      isActive: true,
    });

    component.onSubmit();

    expect(component.loading).toBeFalse();
    expect(window.alert).toHaveBeenCalledWith('Error: API Error');
  });

  it('should close dialog on cancel', () => {
    component.onCancel();
    expect(dialogRefSpy.close).toHaveBeenCalled();
  });

  it('should hide image on error', () => {
    const event = {
      target: { style: { display: 'block' } },
    };

    component.onImageError(event);

    expect(event.target.style.display).toBe('none');
  });
});