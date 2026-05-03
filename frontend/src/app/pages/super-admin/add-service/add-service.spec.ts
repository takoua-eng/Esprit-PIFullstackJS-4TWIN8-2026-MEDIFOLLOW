import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { AddServiceDialog } from './add-service';

describe('AddServiceDialog', () => {
  let component: AddServiceDialog;
  let fixture: ComponentFixture<AddServiceDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddServiceDialog, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AddServiceDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
