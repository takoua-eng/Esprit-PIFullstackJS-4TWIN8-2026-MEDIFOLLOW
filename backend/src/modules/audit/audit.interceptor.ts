import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';

const TRACKED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// GET paths to skip (too noisy / internal)
const SKIP_GET_PATTERNS = [
  /\/auth\/me$/,
  /\/notifications/,
  /\/stats/,
  /\/unread-count/,
  /\/alerts\/count/,
  /^\/audit/,
  /\/reminders$/,
  /\/users\/patients$/,
  /\/users\/doctors$/,
  /\/users\/nurses$/,
  /\/users\/coordinators$/,
  /\/users\/auditors$/,
  /\/users\/admins$/,
  /\/roles$/,
  /\/services$/,
  // Skip auditor overview lists (no entityId)
  /\/coordinator\/auditor\//,
  /\/coordinator\/all\//,
  // Skip generic list GETs
  /\/users$/,
  /\/alerts$/,
  /\/questionnaire-responses$/,
  /\/ai\//,
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;

    if (!TRACKED_METHODS.includes(method)) return next.handle();

    // Skip noisy GET endpoints
    if (method === 'GET') {
      const url: string = req.url ?? '';
      if (SKIP_GET_PATTERNS.some(p => p.test(url))) return next.handle();
    }

    const user = req.user;

    // Skip unauthenticated requests — no user = no audit
    if (!user) return next.handle();

    const ip: string = req.ip ?? 'unknown';
    const url: string = req.url ?? '';
    const entityType = this.resolveEntityType(url);
    const action = this.resolveAction(method, url);

    const startTime = Date.now();

    return next.handle().pipe(
      tap((responseBody) => {
        // Resolve entityId from multiple sources
        const entityId =
          responseBody?._id?.toString() ??
          responseBody?.id?.toString() ??
          req.params?.id ??
          req.params?.patientId ??
          req.params?.reminderId ??
          req.params?.userId ??
          'unknown';

        // For role/permission changes, capture what changed
        const isRoleChange = /\/roles\//.test(url) && (method === 'PUT' || method === 'PATCH');
        const afterData = method !== 'DELETE' && method !== 'GET'
          ? (isRoleChange ? { permissions: responseBody?.permissions, name: responseBody?.name } : responseBody)
          : null;

        // ── Calcul riskLevel ──────────────────────────────────
        const riskLevel = this.resolveRiskLevel(action, url, user);

        // ── Description lisible ───────────────────────────────
        const description = this.resolveDescription(action, entityType, user);

        // ── Module ────────────────────────────────────────────
        const module = this.resolveModule(url);

        // ── Session ID ────────────────────────────────────────
        const sessionId = req.headers?.['x-session-id'] as string
          ?? req.cookies?.['sessionId']
          ?? user?._id?.toString()?.slice(-8);

        this.auditService
          .create({
            userId:     user?._id ?? user?.sub ?? 'anonymous',
            userEmail:  user?.email ?? 'anonymous',
            userRole:   typeof user?.role === 'string' ? user.role : (user?.role as any)?.name ?? 'unknown',
            userName:   user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : (user?.email ?? 'anonymous'),
            action,
            entityType,
            entityId,
            before: null,
            after: afterData,
            ipAddress: ip,
            userAgent: req.headers?.['user-agent'] ?? 'unknown',
            status: 'SUCCESS',
            riskLevel,
            loginAttempts: 0,
            sessionId,
            description,
            module,
          })
          .catch(() => {/* silent */});
      }),
    );
  }

  private resolveDescription(action: string, entityType: string, user: any): string {
    const who = user?.firstName ? `${user.firstName} ${user.lastName ?? ''}`.trim() : (user?.email ?? 'User');
    const entity = entityType?.toLowerCase() ?? 'resource';
    const map: Record<string, string> = {
      CREATE:             `${who} created a new ${entity}`,
      UPDATE:             `${who} updated ${entity}`,
      DELETE:             `${who} deleted ${entity}`,
      LOGIN:              `${who} logged in`,
      LOGOUT:             `${who} logged out`,
      ACTIVATE:           `${who} activated ${entity}`,
      DEACTIVATE:         `${who} deactivated ${entity}`,
      ARCHIVE:            `${who} archived ${entity}`,
      RESTORE:            `${who} restored ${entity}`,
      RESET_PASSWORD:     `${who} reset password`,
      FORGOT_PASSWORD:    `${who} requested password reset`,
      SEND_REMINDER:      `${who} sent a reminder`,
      QUESTIONNAIRE_SUBMIT: `${who} submitted questionnaire`,
      VIEW_PATIENT_VITALS:  `${who} viewed patient vitals`,
      VIEW_PATIENT_DOSSIER: `${who} viewed patient dossier`,
    };
    return map[action] ?? `${who} performed ${action} on ${entity}`;
  }

  private resolveModule(url: string): string {
    const moduleMap: Record<string, string> = {
      'auth':                   'Auth',
      'users':                  'Users',
      'patients':               'Patients',
      'doctors':                'Doctors',
      'nurses':                 'Nurses',
      'coordinators':           'Coordinators',
      'auditors':               'Auditors',
      'roles':                  'Roles',
      'services':               'Services',
      'vitals':                 'Vitals',
      'vital-parameters':       'Vitals',
      'symptoms':               'Symptoms',
      'alerts':                 'Alerts',
      'auto-alerts':            'Alerts',
      'reminders':              'Reminders',
      'questionnaires':         'Questionnaires',
      'questionnaire-responses':'Questionnaires',
      'prescriptions':          'Prescriptions',
      'video-calls':            'Video Calls',
      'coordinator':            'Coordinator',
      'ai':                     'AI',
      'audit':                  'Audit',
    };
    const clean = url.replace(/\?.*$/, '');
    const segments = clean.split('/').filter(Boolean);
    for (const seg of segments) {
      if (moduleMap[seg.toLowerCase()]) return moduleMap[seg.toLowerCase()];
    }
    return 'System';
  }

  private resolveRiskLevel(action: string, url: string, user: any): 'NORMAL' | 'SUSPICIOUS' | 'CRITICAL' {
    // CRITICAL: suppressions, archives, reset password, changements de rôle
    const criticalActions = ['DELETE', 'ARCHIVE', 'DEACTIVATE', 'RESET_PASSWORD', 'FORGOT_PASSWORD'];
    if (criticalActions.includes(action)) return 'CRITICAL';
    if (/\/roles\//.test(url) && action === 'UPDATE') return 'CRITICAL';

    // SUSPICIOUS: accès à des données sensibles, modifications en masse
    const suspiciousActions = ['ACTIVATE', 'RESTORE', 'MARK_ALL_READ'];
    if (suspiciousActions.includes(action)) return 'SUSPICIOUS';
    if (/\/users\//.test(url) && action === 'UPDATE') return 'SUSPICIOUS';
    if (/\/permissions/.test(url)) return 'SUSPICIOUS';

    return 'NORMAL';
  }

  private resolveEntityType(url: string): string {
    const clean = url.replace(/\?.*$/, '');
    const segments = clean.split('/').filter(s => s && !/^[a-f0-9]{24}$/.test(s) && !/^\d+$/.test(s));

    // Friendly mappings
    const friendly: Record<string, string> = {
      'users':                    'USERS',
      'patients':                 'PATIENTS',
      'doctors':                  'DOCTORS',
      'nurses':                   'NURSES',
      'coordinators':             'COORDINATORS',
      'auditors':                 'AUDITORS',
      'admins':                   'ADMINS',
      'roles':                    'ROLES',
      'services':                 'SERVICES',
      'vitals':                   'VITALS',
      'vital-parameters':         'VITALS',
      'symptoms':                 'SYMPTOMS',
      'alerts':                   'ALERTS',
      'auto-alerts':              'AUTO_ALERTS',
      'reminders':                'REMINDERS',
      'questionnaires':           'QUESTIONNAIRES',
      'questionnaire-responses':  'QUESTIONNAIRE_RESPONSES',
      'prescriptions':            'PRESCRIPTIONS',
      'video-calls':              'VIDEO_CALLS',
      'audit':                    'AUDIT',
      'auth':                     'AUTH',
      'coordinator':              'COORDINATOR',
      'dashboard':                'DASHBOARD',
    };

    // Find last meaningful segment
    for (let i = segments.length - 1; i >= 0; i--) {
      const key = segments[i].toLowerCase();
      if (friendly[key]) return friendly[key];
    }

    return segments.map(s => s.toUpperCase()).join('_') || 'UNKNOWN';
  }

  private resolveAction(method: string, url: string): string {
    // ── Specific URL-based actions ────────────────────────────────
    if (method === 'PUT' || method === 'PATCH') {
      if (/\/activate$/.test(url))        return 'ACTIVATE';
      if (/\/deactivate$/.test(url))      return 'DEACTIVATE';
      if (/\/restore$/.test(url))         return 'RESTORE';
      if (/\/archive$/.test(url))         return 'ARCHIVE';
      if (/\/read$/.test(url))            return 'MARK_READ';
      if (/\/read-all$/.test(url))        return 'MARK_ALL_READ';
      if (/\/verify$/.test(url))          return 'VERIFY';
      if (/\/send$/.test(url))            return 'SEND_REMINDER';
      if (/\/complete$/.test(url))        return 'COMPLETE';
      if (/\/cancel$/.test(url))          return 'CANCEL';
      if (/\/accept$/.test(url))          return 'ACCEPT';
      if (/\/decline$/.test(url))         return 'DECLINE';
      if (/\/resolve$/.test(url))         return 'RESOLVE';
      if (/\/acknowledge$/.test(url))     return 'ACKNOWLEDGE';
    }

    if (method === 'POST') {
      if (/\/auth\/logout$/.test(url))    return 'LOGOUT';
      if (/\/reset-password$/.test(url))  return 'RESET_PASSWORD';
      if (/\/forgot-password$/.test(url)) return 'FORGOT_PASSWORD';
      if (/\/questionnaire-responses/.test(url)) return 'QUESTIONNAIRE_SUBMIT';
      if (/\/video-calls/.test(url))      return 'VIDEO_CALL_START';
      if (/\/patient-notes/.test(url))    return 'SEND_NOTE';
      if (/\/reminders/.test(url))        return 'CREATE_REMINDER';
    }

    if (method === 'GET') {
      if (/\/vital-parameters\/patient/.test(url)) return 'VIEW_PATIENT_VITALS';
      if (/\/vitals/.test(url))                    return 'VIEW_VITALS';
      if (/\/symptoms\/patient/.test(url))         return 'VIEW_PATIENT_SYMPTOMS';
      if (/\/nurse-dossier/.test(url))             return 'VIEW_PATIENT_DOSSIER';
      if (/\/auto-alerts\/patient/.test(url))      return 'VIEW_PATIENT_ALERTS';
      if (/\/questionnaire-responses\/patient/.test(url)) return 'VIEW_PATIENT_QUESTIONNAIRES';
      return 'VIEW';
    }

    const map: Record<string, string> = {
      POST:   'CREATE',
      PUT:    'UPDATE',
      PATCH:  'UPDATE',
      DELETE: 'DELETE',
    };
    return map[method] ?? method;
  }
}
