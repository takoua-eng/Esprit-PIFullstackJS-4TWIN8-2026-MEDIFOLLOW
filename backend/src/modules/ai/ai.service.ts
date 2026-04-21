import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectModel('AiUser')     private readonly userModel: Model<any>,
    @InjectModel('AiReminder') private readonly reminderModel: Model<any>,
    @InjectModel('AiRole')     private readonly roleModel: Model<any>,
    @InjectModel('AiVital')    private readonly vitalModel: Model<any>,
    @InjectModel('AiSymptom')  private readonly symptomModel: Model<any>,
    @InjectModel('AiAuditLog') private readonly auditLogModel: Model<any>,
  ) {}

  // ─── DATA COLLECTION ─────────────────────────────────────────

  private async collectData() {
    const [patientRole, coordRole] = await Promise.all([
      this.roleModel.findOne({ name: 'patient' }).lean(),
      this.roleModel.findOne({ name: 'coordinator' }).lean(),
    ]);

    const [patients, coordinators, allReminders] = await Promise.all([
      patientRole ? this.userModel.find({ role: patientRole._id, isArchived: { $ne: true } }).lean() : [],
      coordRole   ? this.userModel.find({ role: coordRole._id,   isArchived: { $ne: true } }).lean() : [],
      this.reminderModel.find().lean(),
    ]);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
    const yesterdayEnd   = new Date(todayEnd);   yesterdayEnd.setDate(todayEnd.getDate() - 1);

    const patientIds = (patients as any[]).map(p => p._id);

    const [vitalsToday, symptomsToday, vitalsYesterday, symptomsYesterday] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: yesterdayStart, $lte: yesterdayEnd } }).lean(),
    ]);

    const buildSet = (docs: any[], field: string) => new Set(docs.map(d => d[field]?.toString()));

    const vitalTodaySet   = buildSet(vitalsToday,    'patientId');
    const symptomTodaySet = buildSet(symptomsToday,  'patientId');
    const vitalYestSet    = buildSet(vitalsYesterday,   'patientId');
    const symptomYestSet  = buildSet(symptomsYesterday, 'patientId');

    const totalPatients     = (patients as any[]).length;
    const totalCoordinators = (coordinators as any[]).length;

    const okToday     = (patients as any[]).filter(p => vitalTodaySet.has(p._id.toString()) && symptomTodaySet.has(p._id.toString())).length;
    const okYesterday = (patients as any[]).filter(p => vitalYestSet.has(p._id.toString())  && symptomYestSet.has(p._id.toString())).length;

    const complianceToday     = totalPatients ? Math.round((okToday     / totalPatients) * 100) : 0;
    const complianceYesterday = totalPatients ? Math.round((okYesterday / totalPatients) * 100) : 0;
    const sentReminders       = (allReminders as any[]).filter(r => r.status === 'sent').length;
    const responseRate        = sentReminders ? Math.round((okToday / sentReminders) * 100) : 0;

    const alerts: string[] = [];
    if (complianceToday === 0)                          alerts.push("Aucun patient actif aujourd'hui");
    if (responseRate    === 0)                          alerts.push('Taux de réponse = 0%');
    if (complianceToday < complianceYesterday - 20)     alerts.push('Chute importante de compliance');

    return { totalPatients, totalCoordinators, complianceToday, complianceYesterday, responseRate, sentReminders, alerts };
  }

  // ─── PROMPT ───────────────────────────────────────────────────

  private buildPrompt(type: string, d: any): string {
    const focus: Record<string, string> = {
      monthly:      'Rapport mensuel global avec tendances.',
      risk:         'Risques médicaux potentiels et patients vulnérables.',
      coordinators: 'Performance et charge de travail des coordinateurs.',
      anomalies:    'Anomalies, incohérences et comportements inhabituels.',
    };

    return `Analyse les données et retourne STRICTEMENT un JSON valide.

DATA:
Patients: ${d.totalPatients}
Compliance today: ${d.complianceToday}% (hier: ${d.complianceYesterday}%)
Response rate: ${d.responseRate}%
Reminders envoyés: ${d.sentReminders}
Coordinateurs: ${d.totalCoordinators}
Alerts: ${d.alerts.length > 0 ? d.alerts.join(', ') : 'Aucune'}

FOCUS: ${focus[type] ?? focus['monthly']}

FORMAT STRICT:
{
  "resume": "string",
  "problemes": ["string"],
  "causes": ["string"],
  "recommandations": ["string"]
}

NO TEXT OUTSIDE JSON.`;
  }

  // ─── CLEAN JSON ───────────────────────────────────────────────

  private cleanJson(text: string) {
    try {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      this.logger.error('JSON parse failed');
      return { resume: 'Erreur AI', problemes: [], causes: [], recommandations: [] };
    }
  }

  // ─── CALL AI ──────────────────────────────────────────────────

  private async callAI(prompt: string): Promise<string> {
    const apiKey = this.config.get<string>('GROQ_API_KEY')
      || '**'; // ← remplace par ta clé Groq

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    const data: any = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // ─── MAIN ─────────────────────────────────────────────────────

  async generateReport(type: string) {
    const data = await this.collectData();
    const prompt = this.buildPrompt(type, data);

    try {
      const raw    = await this.callAI(prompt);
      const report = this.cleanJson(raw);
      return { type, report, data, generatedAt: new Date().toISOString() };
    } catch (err: any) {
      this.logger.error(err.message);
      return {
        type,
        report: { resume: 'AI indisponible', problemes: [], causes: [], recommandations: [] },
        data,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  // ─── AUDITOR: AUDIT REPORT ───────────────────────────────────

  async generateAuditReport() {
    const since24h   = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    const since3d    = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [total, last24h, deletions, logins, criticals] = await Promise.all([
      this.auditLogModel.countDocuments(),
      this.auditLogModel.countDocuments({ createdAt: { $gte: since24h } }),
      this.auditLogModel.countDocuments({ action: { $in: ['DELETE', 'ARCHIVE'] }, createdAt: { $gte: since7d } }),
      this.auditLogModel.countDocuments({ action: 'LOGIN', createdAt: { $gte: since7d } }),
      this.auditLogModel.countDocuments({ action: { $in: ['DELETE', 'ARCHIVE', 'DEACTIVATE', 'RESET_PASSWORD'] }, createdAt: { $gte: since24h } }),
    ]);

    const topUsers = await this.auditLogModel.aggregate([
      { $match: { createdAt: { $gte: since7d } } },
      { $group: { _id: '$userEmail', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    const coordRole = await this.roleModel.findOne({ name: 'coordinator' }).lean();
    const coordinators = coordRole
      ? await this.userModel.find({ role: coordRole._id, isArchived: { $ne: true } }).lean()
      : [];

    const activeCoordIds = await this.reminderModel.distinct('sentBy', { sentAt: { $gte: since3d } });
    const inactiveCoords = (coordinators as any[]).filter(c =>
      !activeCoordIds.map((id: any) => id.toString()).includes(c._id.toString())
    );

    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    const patients = patientRole
      ? await this.userModel.find({ role: patientRole._id, isArchived: { $ne: true } }).lean()
      : [];
    const patientIds = (patients as any[]).map(p => p._id);

    const [vitalsToday, symptomsToday] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
    ]);

    const vitalSet   = new Set((vitalsToday   as any[]).map((v: any) => v.patientId?.toString()));
    const symptomSet = new Set((symptomsToday as any[]).map((s: any) => s.patientId?.toString()));
    const noDataCount = (patients as any[]).filter(p => !vitalSet.has(p._id.toString()) && !symptomSet.has(p._id.toString())).length;

    const data = {
      totalAuditLogs: total, last24hEvents: last24h,
      deletionsLast7d: deletions, loginsLast7d: logins,
      criticalActionsLast24h: criticals,
      topActiveUsers: topUsers.map((u: any) => `${u._id} (${u.count} actions)`),
      inactiveCoordinators: inactiveCoords.length,
      inactiveCoordNames: (inactiveCoords as any[]).slice(0, 3).map((c: any) => `${c.firstName} ${c.lastName}`),
      totalPatients: patients.length, noDataToday: noDataCount,
    };

    const riskScore = Math.min(100, Math.round(
      (data.noDataToday / Math.max(data.totalPatients, 1)) * 40 +
      (data.inactiveCoordinators / Math.max((coordinators as any[]).length, 1)) * 40 +
      (data.criticalActionsLast24h > 0 ? 20 : 0)
    ));
    const riskLevel = riskScore >= 70 ? 'HIGH' : riskScore >= 40 ? 'MEDIUM' : 'LOW';

    const prompt = `Tu es un auditeur médical expert. Retourne STRICTEMENT un JSON valide.

DONNÉES SYSTÈME:
- Total logs: ${data.totalAuditLogs}
- Activité 24h: ${data.last24hEvents}
- Suppressions/Archives (7j): ${data.deletionsLast7d}
- Actions critiques (24h): ${data.criticalActionsLast24h}
- Coordinateurs inactifs (3j): ${data.inactiveCoordinators} sur ${(coordinators as any[]).length} — ${data.inactiveCoordNames.join(', ') || 'aucun'}
- Patients sans données aujourd'hui: ${data.noDataToday}/${data.totalPatients}
- Top utilisateurs actifs: ${data.topActiveUsers.join(' | ')}
- Risk Score calculé: ${riskScore}/100 (${riskLevel})

INSTRUCTIONS:
- Génère un rapport d'audit structuré et actionnable
- Identifie les alertes critiques avec emoji ❌ ou ⚠️
- Propose des actions concrètes avec emoji 🔔 📩 📊 🚨
- Interprète le comportement des top utilisateurs
- Sois précis et professionnel

FORMAT STRICT (JSON uniquement, aucun texte en dehors):
{
  "riskScore": ${riskScore},
  "riskLevel": "${riskLevel}",
  "resume": "string — interprétation globale en 2 phrases",
  "alertes": ["string avec emoji"],
  "risques": ["string"],
  "interpretation": "string — analyse comportementale",
  "actions": ["string avec emoji"],
  "topUsers": ["string — email → comportement (N actions)"]
}
NO TEXT OUTSIDE JSON.`;

    try {
      const raw    = await this.callAI(prompt);
      const report = this.cleanJson(raw);
      return { report: { ...report, riskScore, riskLevel }, data, generatedAt: new Date().toISOString() };
    } catch (err: any) {
      this.logger.error(err.message);
      return {
        report: { resume: 'AI indisponible', riskScore, riskLevel, alertes: [], risques: [], interpretation: '', actions: [], topUsers: [] },
        data, generatedAt: new Date().toISOString(),
      };
    }
  }
}
