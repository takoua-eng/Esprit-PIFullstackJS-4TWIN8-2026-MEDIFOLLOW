import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../core/api.config';

export type TemplateQuestionType =
  | 'text'
  | 'number'
  | 'single_choice'
  | 'multiple_choice';

export interface CreateTemplateQuestionPayload {
  label: string;
  type: TemplateQuestionType;
  options?: string[];
  required?: boolean;
}

/** Body for POST /api/questionnaires/templates (matches backend CreateTemplateDto). */
export interface CreateTemplatePayload {
  title: string;
  category: string;
  allowDoctorToAddQuestions: boolean;
  questions: CreateTemplateQuestionPayload[];
}

export interface QuestionnaireTemplateQuestionApi {
  label: string;
  type?: TemplateQuestionType;
  options?: string[];
  required?: boolean;
}

export interface QuestionnaireTemplateListItem {
  _id: string;
  title: string;
  category: string;
  allowDoctorToAddQuestions?: boolean;
  questions?: QuestionnaireTemplateQuestionApi[];
}

export type QuestionnaireTemplateDetail = QuestionnaireTemplateListItem;

@Injectable({ providedIn: 'root' })
export class QuestionnaireService {
  private readonly http = inject(HttpClient);
  private readonly templatesUrl = `${API_BASE_URL}/api/questionnaires/templates`;

  getTemplates(): Observable<QuestionnaireTemplateListItem[]> {
    return this.http.get<QuestionnaireTemplateListItem[]>(this.templatesUrl);
  }

  createTemplate(data: CreateTemplatePayload): Observable<unknown> {
    return this.http.post(this.templatesUrl, data);
  }

  getTemplateById(id: string): Observable<QuestionnaireTemplateDetail> {
    return this.http.get<QuestionnaireTemplateDetail>(
      `${this.templatesUrl}/${encodeURIComponent(id)}`,
    );
  }

  updateTemplate(
    id: string,
    data: CreateTemplatePayload,
  ): Observable<unknown> {
    return this.http.patch(`${this.templatesUrl}/${encodeURIComponent(id)}`, data);
  }
}
