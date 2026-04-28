import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddServiceDialog } from './add-service';

describe('AddServiceDialog', () => {
  let component: AddServiceDialog;
  let fixture: ComponentFixture<AddServiceDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddServiceDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(AddServiceDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
