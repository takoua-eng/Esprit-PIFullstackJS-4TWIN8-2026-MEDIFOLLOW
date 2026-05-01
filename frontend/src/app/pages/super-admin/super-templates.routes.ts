import { Routes } from '@angular/router';

export const SUPER_TEMPLATES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./super-questionnaire-list/super-questionnaire-list').then(
        (m) => m.SuperQuestionnaireListComponent,
      ),
    data: { title: 'Questionnaire templates' },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('../../components/template-builder/template-builder').then(
        (m) => m.TemplateBuilderComponent,
      ),
    data: { title: 'Create questionnaire template', emptyTemplate: true },
  },
  {
    path: 'edit/:id',
    loadComponent: () =>
      import('../../components/template-builder/template-builder').then(
        (m) => m.TemplateBuilderComponent,
      ),
    data: { title: 'Edit questionnaire template' },
  },
];
