import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import {
  QuestionnaireTemplateListItem,
  QuestionnaireService,
} from 'src/app/services/questionnaire.service';

@Component({
  selector: 'app-super-questionnaire-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  templateUrl: './super-questionnaire-list.html',
  styleUrl: './super-questionnaire-list.scss',
})
export class SuperQuestionnaireListComponent implements OnInit {
  private readonly questionnaireService = inject(QuestionnaireService);

  templates: QuestionnaireTemplateListItem[] = [];
  loading = true;
  loadError: string | null = null;

  ngOnInit(): void {
    this.loading = true;
    this.loadError = null;
    this.questionnaireService.getTemplates().subscribe({
      next: (rows) => {
        this.templates = rows ?? [];
        this.loading = false;
      },
      error: () => {
        this.templates = [];
        this.loadError = 'Impossible de charger les modèles de questionnaire.';
        this.loading = false;
      },
    });
  }

  questionCount(t: QuestionnaireTemplateListItem): number {
    return t.questions?.length ?? 0;
  }
}
