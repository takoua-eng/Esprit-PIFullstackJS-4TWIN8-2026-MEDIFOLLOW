import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddCoordinatorDialog } from './add-coordinateur-dialog';

describe('AddCoordinatorDialog', () => {
  let component: AddCoordinatorDialog;
  let fixture: ComponentFixture<AddCoordinatorDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddCoordinatorDialog]
    }).compileComponents();

    fixture = TestBed.createComponent(AddCoordinatorDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
