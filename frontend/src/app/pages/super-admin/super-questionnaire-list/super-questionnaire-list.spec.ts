import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { SuperQuestionnaireListComponent } from './super-questionnaire-list';
import { QuestionnaireService } from 'src/app/services/questionnaire.service';

describe('SuperQuestionnaireListComponent', () => {
  let component: SuperQuestionnaireListComponent;
  let fixture: ComponentFixture<SuperQuestionnaireListComponent>;

  const mockService = {
    getTemplates: jasmine.createSpy(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuperQuestionnaireListComponent],
      providers: [
        { provide: QuestionnaireService, useValue: mockService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SuperQuestionnaireListComponent);
    component = fixture.componentInstance;
  });

  it('should create component', () => {
    mockService.getTemplates.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component).toBeTruthy();
  });

  it('should load templates successfully', () => {
    const mockData = [
      { id: '1', title: 'Test', questions: [{}, {}] },
    ];

    mockService.getTemplates.and.returnValue(of(mockData));

    fixture.detectChanges(); // triggers ngOnInit

    expect(component.templates.length).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.loadError).toBeNull();
  });

  it('should handle API error', () => {
    mockService.getTemplates.and.returnValue(
      throwError(() => new Error('error'))
    );

    fixture.detectChanges();

    expect(component.templates.length).toBe(0);
    expect(component.loading).toBeFalse();
    expect(component.loadError).toBe(
      'Impossible de charger les modèles de questionnaire.'
    );
  });

  it('should count questions correctly', () => {
    const template: any = {
      questions: [{}, {}, {}, {}],
    };

    expect(component.questionCount(template)).toBe(4);
  });

  it('should return 0 when questions is undefined', () => {
    const template: any = {};

    expect(component.questionCount(template)).toBe(0);
  });
});