// src/app/pages/pages.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from '../core/auth.guard';
import { roleGuard } from '../core/role.guard';
//import { staffAdminGuard } from '../core/staff-admin.guard';

// Admin Components
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { AdminProfileComponent } from './admin-profile/admin-profile.component';
import { Patients } from './admin/patients/patients';
//import { MedecinsComponent } from './admin/medecins/medecins';
import { CoordinateursComponent } from './admin/coordinateurs/coordinateurs';
import { NursesComponent } from './admin/nurses/nurses';
import { AuditorsAComponent } from './admin/auditorsA/auditorsA';
import { CoordinatorDashboardComponent } from './coordinator/coordinator-dashboard/coordinator-dashboard.component';
import { RemindersComponent } from './coordinator/reminders/reminders';
import { CoordinatorPatientsComponent } from './coordinator/coordinator-patients/coordinator-patients';

import { AuditLogsComponent } from './super-admin/audit-logs/audit-logs';

import { UserManagementComponent } from './super-admin/user-management/user-management.component';

import { AiIntelligenceComponent } from './super-admin/ai-intelligence/ai-intelligence.component';
import { SuperAdminDashboardComponent } from './super-admin/superadmin-dashboard/superadmin-dashboard.component';
//import { SuperAdminProfileComponent } from './super-admin/superadmin-profile/superadmin-profile.component';
import { AdminsComponent } from './super-admin/admins/admins';
import { Patients as SuperPatients } from './super-admin/patients/patients';

import { NursesComponent as SuperNurses } from './super-admin/nurses/nurses';

import { AuditorsComponent as SuperAuditors } from './super-admin/auditors/auditors';

// Auditor Components
import { AuditorDashboardComponent } from './auditor/auditor-dashboard/auditor-dashboard.component';
import { AuditorVerifyComponent } from './auditor/auditor-verify/auditor-verify.component';
import { AuditorPatientsComponent } from './auditor/auditor-patients/auditor-patients.component';
import { AuditorCoordinatorsComponent } from './auditor/auditor-coordinators/auditor-coordinators.component';
import { AuditorRemindersComponent } from './auditor/auditor-reminders/auditor-reminders.component';
import { AuditorAnomaliesComponent } from './auditor/auditor-anomalies/auditor-anomalies.component';

// Patient Components (from main)
import { DashboardComponent } from './patient/dashboard/dashboard.component';
import { DossiersComponent } from './patient/dossiers/dossiers.component';
//import { ProfilComponent } from './patient/profile/profil.component';
import { ParametersComponent } from './patient/parameters/parameters.component';
import { SymptomsComponent } from './patient/symptoms/symptoms.component';
import { QuestionnairesComponent } from './patient/questionnaires/questionnaires.component';
import { HistoryComponent } from './patient/history/history.component';
import { AlertsComponent } from './patient/alerts/alerts.component';
// Nurse & doctor workspaces
import { NurseDashboardComponent } from './nurse/dashboard/nurse-dashboard.component';
import { NurseAlertsComponent } from './nurse/alerts/nurse-alerts.component';
import { NurseRemindersComponent } from './nurse/reminders/nurse-reminders.component';
import { NurseMedicalFileComponent } from './nurse/medical-file/nurse-medical-file.component';
import { DoctorDashboardComponent } from './doctor/dashboard/doctor-dashboard.component';
import { DoctorAlertsComponent } from './doctor/alerts/doctor-alerts.component';
import { DoctorHistoryComponent } from './doctor/history/doctor-history.component';
import { DoctorPrescriptionsComponent } from './doctor/prescriptions/doctor-prescriptions.component';
import { MessagesDoctorComponent } from './doctor/messages-doctor/messages-doctor.component';
import { StrokeRiskComponent } from './super-admin/stroke-risk/stroke-risk.component';
import { DoctorNotificationsComponent } from './doctor/notifications/doctor-notifications.component';
import { MessagesPatientComponent } from './patient/messages-patient/messages-patient.component';
import { AiChatComponent } from './patient/ai-chat/ai-chat.component';
import { AiPredictionComponent } from './coordinator/ai-prediction/ai-prediction.component';
import { ServiceComponent } from './super-admin/service/service';
import { RoleComponent } from './super-admin/role/role';
import { PermissionGuard } from '../permission.guard';
import { MedecinsComponent } from './admin/medecins/medecins';
import { ProfilComponent } from './profil/profil.component';
import { PatientPrescriptionsComponent } from './patient/prescriptions/patient-prescriptions.component';

/** Roles allowed to use the sub-admin `/dashboard/admin/...` area (not patients, not coordinators). */
const staffAdminGuard = [
  authGuard,
  roleGuard(['admin', 'superadmin', 'nurse', 'doctor', 'physician', 'auditor']),
];

// ✅ ADMIN ROUTES
// ✅ ADMIN ROUTES — préfixe URL : `/dashboard/admin/...`
export const AdminRoutes: Routes = [
  {
    path: '',
    component: AdminDashboardComponent,
    pathMatch: 'full',
    canActivate: [...staffAdminGuard],

  },
  {
    path: 'patients',
    component: Patients,
    canActivate: staffAdminGuard,
  },
    {
    path: 'physicians',
    component: MedecinsComponent,
    canActivate: staffAdminGuard,
  },
  {
    path: 'nurses',
    component: NursesComponent,
    canActivate: staffAdminGuard,
  },
  {
    path: 'coordinators',
    component: CoordinateursComponent,
    canActivate: staffAdminGuard,
  },
  {
    path: 'auditors',
    component: AuditorsAComponent,
    canActivate: staffAdminGuard,
  },

  // ✅ redirect SANS guard
  {
    path: 'template-builder',
    redirectTo: 'templates/create',
    pathMatch: 'full',
  },
  {
    path: 'questionnaire-templates',
    redirectTo: 'templates',
    pathMatch: 'full',
  },

  {
    path: 'profil',
    component: ProfilComponent,
 
  },
];
// ✅ COORDINATOR ROUTES — loaded only from `/admin/coordinator` (see `app.routes.ts`)
export const CoordinatorRoutes: Routes = [
  {
    path: '',
    component: CoordinatorDashboardComponent,
    data: { title: 'Coordinator Dashboard' },
  },
  {
    path: 'patients',
    component: CoordinatorPatientsComponent,
    data: { title: 'My Patients' },
  },
  {
    path: 'reminders',
    component: RemindersComponent,
    data: { title: 'Reminders' },
  },

  {
    path: 'prediction',
    component: AiPredictionComponent,
    data: { title: 'AI Prediction' },
  },
];

const nurseOnlyGuard = [authGuard, roleGuard(['nurse'])];
const doctorOnlyGuard = [authGuard, roleGuard(['doctor', 'physician'])];

/** Nurse portal: `/dashboard/nurse`, `/dashboard/nurse/alerts`, … */
export const NurseRoutes: Routes = [
  {
    path: 'nurse',
    canActivate: nurseOnlyGuard,
    children: [
      {
        path: '',
        component: NurseDashboardComponent,
        data: { title: 'Nurse Dashboard' },
      },
      {
        path: 'alerts',
        component: NurseAlertsComponent,
        data: { title: 'Nurse Alerts' },
      },
      {
        path: 'reminders',
        component: NurseRemindersComponent,
        data: { title: 'Nurse Reminders' },
      },
      {
        path: 'medical-file',
        component: NurseMedicalFileComponent,
        data: { title: 'Nurse Medical File' },
      },
    ],
  },
];

export const ProfilRoutes: Routes = [
  { path: 'profil', component: ProfilComponent },
];    

/** Physician portal: `/dashboard/doctor`, `/dashboard/doctor/alerts`, … */
export const DoctorRoutes: Routes = [
  {
    path: 'doctor',
    canActivate: doctorOnlyGuard,
    children: [
      {
        path: '',
        component: DoctorDashboardComponent,
        data: { title: 'Doctor Dashboard' },
      },
      {
        path: 'alerts',
        component: DoctorAlertsComponent,
        data: { title: 'Doctor Alerts' },
      },
      {
        path: 'history',
        component: DoctorHistoryComponent,
        data: { title: 'Doctor History' },
      },
      {
        path: 'prescriptions',
        component: DoctorPrescriptionsComponent,
        data: { title: 'Doctor Prescriptions' },
      },
      {
        path: 'messages',
        component: MessagesDoctorComponent,
        data: { title: 'Messages' },
      },
      {
        path: 'medical-file',
        component: NurseMedicalFileComponent,
        data: { title: 'Patient Medical File' },
      },
      {
        path: 'stroke-risk',
        component: StrokeRiskComponent,
        data: { title: 'Risque AVC (ML)' },
      },
      {
        path: 'notifications',
        component: DoctorNotificationsComponent,
        data: { title: 'Notifications' },
      },
    ],
  },
];

const superAdminOnlyGuard = [authGuard, roleGuard(['superadmin'])];

// ✅ SUPER ADMIN ROUTES
export const SuperAdminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'dashboard',
    component: SuperAdminDashboardComponent,
  },
  {
    path: 'profile',
    component: ProfilComponent,
  },
  {
    path: 'admin-users',
    component: AdminsComponent,
  
  
  },
  {
    path: 'users',
    component: UserManagementComponent,
    canActivate: [PermissionGuard],
  },
  {
    path: 'patients',
    component: SuperPatients,
    canActivate: [PermissionGuard],
    
  },

  {
    path: 'nurses',
    component: SuperNurses,
    canActivate: [PermissionGuard],

  },
  {
    path: 'auditors',
    component: SuperAuditors,
    canActivate: [PermissionGuard],

  },
  {
    path: 'services',
    component: ServiceComponent,
    canActivate: [PermissionGuard],

  },
  {
    path: 'role',
    component: RoleComponent,
    canActivate: [PermissionGuard],

  },
{
  path: 'audit-logs',
  component: AuditLogsComponent,
  canActivate: [PermissionGuard],
},
{
  path: 'ai-intelligence',
  component: AiIntelligenceComponent,
  canActivate: superAdminOnlyGuard,
},
];

const patientOnlyGuard = [authGuard, roleGuard(['patient'])];

// ✅ PATIENT ROUTES (portal — only `patient` role)
export const PatientRoutes: Routes = [
  {
    path: 'patient',
    canActivate: patientOnlyGuard,
    children: [
      { path: 'dashboard', component: DashboardComponent, data: { title: 'Dashboard' } },
      { path: 'dossiers', component: DossiersComponent, data: { title: 'Dossiers' } },
      { path: 'profile', component: ProfilComponent, data: { title: 'Profil' } },
      { path: 'parameters', component: ParametersComponent, data: { title: 'Mes Paramètres' } },
      { path: 'symptoms', component: SymptomsComponent, data: { title: 'Mes Symptômes' } },
      { path: 'questionnaires', component: QuestionnairesComponent, data: { title: 'Questionnaires' } },
      { path: 'history', component: HistoryComponent, data: { title: 'Historique' } },
      { path: 'alerts', component: AlertsComponent, data: { title: 'Alerts' } },
      { path: 'messages', component: MessagesPatientComponent, data: { title: 'Messages' } },
      { path: 'ai-chat', component: AiChatComponent, data: { title: 'Assistant IA' } },
      { path: 'prescriptions', component: PatientPrescriptionsComponent, data: { title: 'Mes Prescriptions' } },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
];

/** `/dashboard` lazy chunk: sub-admin, nurse/doctor portals, super-admin shell, patient portal — not coordinator (use `/admin/coordinator`). */
export const PagesRoutes: Routes = [
  ...PatientRoutes,
  ...NurseRoutes,
  ...DoctorRoutes,
  ...AdminRoutes,
  ...SuperAdminRoutes,
];

// ✅ AUDITOR ROUTES
export const AuditorRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard',    component: AuditorDashboardComponent },
  { path: 'patients',     component: AuditorPatientsComponent,     canActivate: [PermissionGuard], data: { permission: 'audit:read' } },
  { path: 'coordinators', component: AuditorCoordinatorsComponent, canActivate: [PermissionGuard], data: { permission: 'audit:read' } },
  { path: 'reminders',    component: AuditorRemindersComponent,    canActivate: [PermissionGuard], data: { permission: 'audit:read' } },
  { path: 'anomalies',    component: AuditorAnomaliesComponent,    canActivate: [PermissionGuard], data: { permission: 'audit:read' } },
  { path: 'logs',         component: AuditLogsComponent,           canActivate: [PermissionGuard], data: { permission: 'audit:read' } },
  { path: 'verify',       component: AuditorVerifyComponent,       canActivate: [PermissionGuard], data: { permission: 'audit:read' } },
  { path: 'profile',      component: ProfilComponent },
];
