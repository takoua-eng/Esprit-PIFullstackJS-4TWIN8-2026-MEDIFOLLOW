import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddAuditorDialog } from './add-auditor';

describe('AddAuditorDialog', () => {
  let component: AddAuditorDialog;
  let fixture: ComponentFixture<AddAuditorDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAuditorDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(AddAuditorDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
