import { Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { FullSuperComponent } from './pages/super-admin/full-super/full-super';
import { AuditorLayoutComponent } from './pages/auditor/auditor-layout/auditor-layout.component';
import { LandingComponent } from './pages/landing/landing.component';
import { staffAdminGuard } from './core/staff-admin.guard';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { ForbiddenComponent } from './pages/forbidden/forbidden';

export const routes: Routes = [
  {
    path: '',
    children: [
      { path: '', redirectTo: '/landing', pathMatch: 'full' },
      { path: 'landing', component: LandingComponent },

      // ✅ Coordinator routes
      {
        path: 'admin/coordinator',
        component: FullComponent,
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.CoordinatorRoutes),
      },

      // ✅ Admin Templates (protected)
      {
        path: 'admin/templates',
        component: FullComponent,
        canActivate: staffAdminGuard, // juste la fonction, pas de tableau
        loadChildren: () =>
          import('./pages/admin/admin-templates.routes').then(
            (m) => m.ADMIN_TEMPLATES_ROUTES
          ),
      },

      {
        path: 'profil',
        component: FullComponent,
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.ProfilRoutes),
      },

      // ✅ Redirect /template-builder → /templates/create
      {
        path: 'admin/template-builder',
        redirectTo: 'admin/templates/create',
        pathMatch: 'full',
      },

      // ✅ Redirect /questionnaire-templates → /templates
      {
        path: 'admin/questionnaire-templates',
        redirectTo: 'admin/templates',
        pathMatch: 'full',
      },

      // ✅ Dashboard routes
      {
        path: 'dashboard',
        component: FullComponent,
        children: [
          {
            path: '',
            loadChildren: () =>
              import('./pages/pages.routes').then((m) => m.PagesRoutes),
          },
          {
            path: 'admin',
            loadChildren: () =>
              import('./pages/pages.routes').then((m) => m.AdminRoutes),
          },
          {
            path: 'ui-components',
            loadChildren: () =>
              import('./pages/ui-components/ui-components.routes').then(
                (m) => m.UiComponentsRoutes
              ),
          },
          {
            path: 'extra',
            loadChildren: () =>
              import('./pages/extra/extra.routes').then(
                (m) => m.ExtraRoutes
              ),
          },
        ],
      },

      // ✅ Super Admin routes
      {
        path: 'super-admin',
        component: FullComponent,
        canActivate: [authGuard, roleGuard(['superadmin'])],
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.SuperAdminRoutes),
      },

      {
        path: 'auditor',
        component: FullComponent,
        canActivate: [authGuard, roleGuard(['auditor'])],
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.AuditorRoutes),
      },
    ],
  },

  // ✅ Authentication routes
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: 'authentication',
        loadChildren: () =>
          import('./pages/authentication/authentication.routes').then(
            (m) => m.AuthenticationRoutes
          ),
      },
    ],
  },
  {
    path: '403',
    component: ForbiddenComponent,
  },

  // ✅ Catch-all 404
  { path: '**', redirectTo: 'authentication/error' },
];
