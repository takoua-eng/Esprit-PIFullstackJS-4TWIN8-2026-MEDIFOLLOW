import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { AddAuditorDialog } from './add-auditor';

describe('AddAuditorDialog', () => {
  let component: AddAuditorDialog;
  let fixture: ComponentFixture<AddAuditorDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAuditorDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddAuditorDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
