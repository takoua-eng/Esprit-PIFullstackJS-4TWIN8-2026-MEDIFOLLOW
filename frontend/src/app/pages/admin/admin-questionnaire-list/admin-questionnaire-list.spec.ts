import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminQuestionnaireListComponent } from './admin-questionnaire-list';
import { TranslateModule } from '@ngx-translate/core';
import { QuestionnaireService } from 'src/app/services/questionnaire.service';
import { of, throwError } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';

describe('AdminQuestionnaireListComponent', () => {
  let component: AdminQuestionnaireListComponent;
  let fixture: ComponentFixture<AdminQuestionnaireListComponent>;
  let questionnaireServiceSpy: jasmine.SpyObj<QuestionnaireService>;

  beforeEach(async () => {
    questionnaireServiceSpy = jasmine.createSpyObj('QuestionnaireService', ['getTemplates']);

    await TestBed.configureTestingModule({
      imports: [
        AdminQuestionnaireListComponent,
        TranslateModule.forRoot(),
        RouterTestingModule
      ],
      providers: [
        { provide: QuestionnaireService, useValue: questionnaireServiceSpy }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminQuestionnaireListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    questionnaireServiceSpy.getTemplates.and.returnValue(of([]));
    fixture.detectChanges(); // Triggers ngOnInit
    expect(component).toBeTruthy();
  });

  it('should load templates successfully', () => {
    const mockTemplates = [
      { id: '1', title: 'Test 1', questions: [{ id: 'q1', text: 'Q1' }] },
      { id: '2', title: 'Test 2', questions: [] }
    ];
    questionnaireServiceSpy.getTemplates.and.returnValue(of(mockTemplates as any));
    
    fixture.detectChanges(); // Triggers ngOnInit
    
    expect(component.loading).toBeFalse();
    expect(component.templates.length).toBe(2);
    expect(component.loadError).toBeNull();
  });

  it('should handle error when loading templates fails', () => {
    questionnaireServiceSpy.getTemplates.and.returnValue(throwError(() => new Error('API Error')));
    
    fixture.detectChanges(); // Triggers ngOnInit
    
    expect(component.loading).toBeFalse();
    expect(component.templates.length).toBe(0);
    expect(component.loadError).toBe('Impossible de charger les modèles de questionnaire.');
  });

  it('should count questions correctly', () => {
    questionnaireServiceSpy.getTemplates.and.returnValue(of([]));
    fixture.detectChanges();

    const templateWithQuestions = { id: '1', title: 'Test 1', questions: [{ id: 'q1', text: 'Q1' }] };
    const templateWithoutQuestions = { id: '2', title: 'Test 2' };

    expect(component.questionCount(templateWithQuestions as any)).toBe(1);
    expect(component.questionCount(templateWithoutQuestions as any)).toBe(0);
  });
});
