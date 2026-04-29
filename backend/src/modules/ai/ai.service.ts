import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  // Gemini client
  private geminiClient: any | null = null;
  private geminiModel: string;

  constructor(
    private readonly config: ConfigService,
    @InjectModel('AiUser')     private readonly userModel: Model<any>,
    @InjectModel('AiReminder') private readonly reminderModel: Model<any>,
    @InjectModel('AiRole')     private readonly roleModel: Model<any>,
    @InjectModel('AiVital')    private readonly vitalModel: Model<any>,
    @InjectModel('AiSymptom')  private readonly symptomModel: Model<any>,
    @InjectModel('AiAuditLog') private readonly auditLogModel: Model<any>,
  ) {
    const geminiKey = this.config.get<string>('GEMINI_API_KEY') || this.config.get<string>('GEMINI_KEY');
    this.geminiModel = this.config.get<string>('GEMINI_MODEL') || 'models/gemini-2.5-flash';

    if (geminiKey) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: geminiKey });
      } catch {
        this.logger.warn('Gemini init failed — will use Groq fallback');
      }
    }
  }

  // ─── PATIENT CHAT (Gemini) ────────────────────────────────────

  async chatWithPatient(message: string, patientContext?: any): Promise<string> {
    const systemPrompt = `Tu es un assistant de santé. Tu donnes des conseils généraux uniquement. Pas de diagnostic, pas de prescription. Si urgence, conseille de contacter un professionnel.`;
    const contextText  = patientContext ? `Contexte: ${JSON.stringify(patientContext)}\n` : '';
    const prompt       = `${systemPrompt}\n${contextText}\nQuestion: ${message}\nRéponse:`;

    if (!this.geminiClient) return this.fallbackReply();

    try {
      const res  = await this.geminiClient.models.generateContent({ model: this.geminiModel, contents: prompt, temperature: 0.2 });
      const text = this.extractGeminiText(res).trim();
      return text || this.fallbackReply();
    } catch {
      return this.fallbackReply();
    }
  }

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
    if (complianceToday === 0)                      alerts.push("Aucun patient actif aujourd'hui");
    if (responseRate    === 0)                      alerts.push('Taux de réponse = 0%');
    if (complianceToday < complianceYesterday - 20) alerts.push('Chute importante de compliance');

    return { totalPatients, totalCoordinators, complianceToday, complianceYesterday, responseRate, sentReminders, alerts };
  }

  // ─── SERVICE INTELLIGENCE (5 analyses) ──────────────────────

  async getServiceIntelligence() {
    const since7d    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    const since2d    = new Date(Date.now() - 2  * 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // Roles
    const [patientRole, doctorRole, nurseRole] = await Promise.all([
      this.roleModel.findOne({ name: 'patient' }).lean(),
      this.roleModel.findOne({ name: 'doctor' }).lean(),
      this.roleModel.findOne({ name: 'nurse' }).lean(),
    ]);

    // Users
    const [patients, doctors, nurses] = await Promise.all([
      patientRole ? this.userModel.find({ role: patientRole._id, isArchived: { $ne: true } }).lean() : [],
      doctorRole  ? this.userModel.find({ role: doctorRole._id,  isArchived: { $ne: true } }).lean() : [],
      nurseRole   ? this.userModel.find({ role: nurseRole._id,   isArchived: { $ne: true } }).lean() : [],
    ]);

    const patientIds = (patients as any[]).map(p => p._id);

    // Vitals + Symptoms today & last 7 days
    const [vitalsToday, symptomsToday, vitals7d, symptoms7d, reminders7d] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: since7d } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: since7d } }).lean(),
      this.reminderModel.find({ createdAt: { $gte: since7d } }).lean(),
    ]);

    const totalPatients = (patients as any[]).length;
    const totalDoctors  = (doctors as any[]).length;
    const totalNurses   = (nurses as any[]).length;

    // ── 1. Détection surcharge services ──────────────────────────
    const serviceMap: Record<string, { patients: number; alerts: number; name: string }> = {};
    (patients as any[]).forEach(p => {
      const sid = p.serviceId?.toString() || 'unknown';
      if (!serviceMap[sid]) serviceMap[sid] = { patients: 0, alerts: 0, name: p.serviceName || sid.slice(-4) };
      serviceMap[sid].patients++;
    });
    (symptoms7d as any[]).forEach(s => {
      const p = (patients as any[]).find(pt => pt._id.toString() === s.patientId?.toString());
      if (p) {
        const sid = p.serviceId?.toString() || 'unknown';
        if (serviceMap[sid]) serviceMap[sid].alerts++;
      }
    });

    const avgPatientsPerService = totalPatients / Math.max(Object.keys(serviceMap).length, 1);
    const overloadedServices = Object.entries(serviceMap)
      .filter(([, v]) => v.patients > avgPatientsPerService * 1.4 || v.alerts > 5)
      .map(([id, v]) => ({
        serviceId: id,
        name: v.name,
        patients: v.patients,
        alerts: v.alerts,
        overloadScore: Math.round((v.patients / Math.max(avgPatientsPerService, 1)) * 50 + (v.alerts / 10) * 50),
      }))
      .sort((a, b) => b.overloadScore - a.overloadScore)
      .slice(0, 3);

    // ── 2. Score de performance des services ─────────────────────
    const vitalTodaySet   = new Set((vitalsToday   as any[]).map((v: any) => v.patientId?.toString()));
    const symptomTodaySet = new Set((symptomsToday as any[]).map((s: any) => s.patientId?.toString()));
    const sentReminders   = (reminders7d as any[]).filter(r => r.status === 'sent').length;
    const respondedCount  = (patients as any[]).filter(p =>
      vitalTodaySet.has(p._id.toString()) && symptomTodaySet.has(p._id.toString())
    ).length;

    const complianceRate  = totalPatients ? Math.round((respondedCount / totalPatients) * 100) : 0;
    const responseRate    = sentReminders ? Math.round((respondedCount / sentReminders) * 100) : 0;

    const serviceScores = Object.entries(serviceMap).map(([id, v]) => {
      const svcPatients = (patients as any[]).filter(p => p.serviceId?.toString() === id);
      const svcCompliant = svcPatients.filter(p =>
        vitalTodaySet.has(p._id.toString()) && symptomTodaySet.has(p._id.toString())
      ).length;
      const score = svcPatients.length > 0
        ? Math.round((svcCompliant / svcPatients.length) * 70 + (v.alerts < 3 ? 30 : v.alerts < 6 ? 15 : 0))
        : 50;
      return { name: v.name, score, patients: v.patients, status: score >= 70 ? 'good' : score >= 40 ? 'warning' : 'critical' };
    }).sort((a, b) => b.score - a.score).slice(0, 5);

    // ── 3. Prédiction surcharge (tendance 7j) ────────────────────
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    const dailySymptoms = days.map(day =>
      (symptoms7d as any[]).filter(s => s.reportedAt?.toISOString?.()?.startsWith(day) || s.reportedAt?.toString?.()?.startsWith(day)).length
    );
    const trend = dailySymptoms.length >= 3
      ? dailySymptoms.slice(-3).reduce((a, b) => a + b, 0) / 3 - dailySymptoms.slice(0, 3).reduce((a, b) => a + b, 0) / 3
      : 0;
    const predictionRisk = trend > 2 ? 'HIGH' : trend > 0.5 ? 'MEDIUM' : 'LOW';
    const predictionMsg  = trend > 2
      ? `Surcharge probable dans 2 jours (+${Math.round(trend * 2)} symptômes/jour)`
      : trend > 0.5
      ? `Légère hausse détectée — surveiller les prochains jours`
      : `Charge stable — aucune surcharge prévue`;

    // ── 4. Tendances symptômes ────────────────────────────────────
    const symptomCount: Record<string, number> = {};
    (symptoms7d as any[]).forEach(s => {
      const type = s.type || s.symptomType || s.name || 'inconnu';
      symptomCount[type] = (symptomCount[type] ?? 0) + 1;
    });
    const topSymptoms = Object.entries(symptomCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // ── 5. Résumé automatique IA ──────────────────────────────────
    const criticalSymptoms = (symptoms7d as any[]).filter(s =>
      ['chest_pain', 'difficulty_breathing', 'severe_headache', 'high_fever'].includes(s.type?.toLowerCase?.() || '')
    ).length;

    const summaryData = {
      totalPatients, totalDoctors, totalNurses,
      complianceRate, responseRate, sentReminders,
      criticalSymptoms, topSymptoms: topSymptoms.slice(0, 3).map(s => `${s.name}(${s.count})`).join(', '),
      overloadedCount: overloadedServices.length,
      predictionRisk,
    };

    const summaryPrompt = `Tu es un système d'intelligence médicale. Génère un résumé quotidien COURT et PROFESSIONNEL.
DONNÉES: ${JSON.stringify(summaryData)}
FORMAT STRICT JSON:
{
  "titre": "Résumé du ${new Date().toLocaleDateString('fr-FR')}",
  "statut": "STABLE|ATTENTION|CRITIQUE",
  "resume": "2-3 phrases max",
  "points": ["point clé 1 avec emoji", "point clé 2", "point clé 3"],
  "action_prioritaire": "1 action concrète"
}
NO TEXT OUTSIDE JSON.`;

    let summary: any = {
      titre: `Résumé du ${new Date().toLocaleDateString('fr-FR')}`,
      statut: criticalSymptoms > 5 || overloadedServices.length > 2 ? 'CRITIQUE' : complianceRate < 30 ? 'ATTENTION' : 'STABLE',
      resume: `${totalPatients} patients actifs. Compliance: ${complianceRate}%. ${overloadedServices.length} service(s) sous pression.`,
      points: [
        `📊 ${complianceRate}% de compliance aujourd'hui`,
        `🔔 ${sentReminders} rappels envoyés cette semaine`,
        `⚕️ ${topSymptoms[0]?.name || 'Aucun'} symptôme dominant`,
      ],
      action_prioritaire: overloadedServices[0]
        ? `Réaffecter des ressources au service ${overloadedServices[0].name}`
        : 'Système stable — maintenir la surveillance',
    };

    try {
      const raw = await this.callAI(summaryPrompt);
      summary = this.cleanJson(raw);
    } catch { /* use fallback */ }

    return {
      overloadedServices,
      serviceScores,
      prediction: { risk: predictionRisk, message: predictionMsg, trend: Math.round(trend * 10) / 10, dailySymptoms, days },
      topSymptoms,
      summary,
      generatedAt: new Date().toISOString(),
    };
  }

  // ─── SUPER ADMIN REPORT ───────────────────────────────────────

  async generateReport(type: string) {
    const d = await this.collectData();

    const focus: Record<string, string> = {
      monthly:      'Rapport mensuel global avec tendances.',
      risk:         'Risques médicaux potentiels et patients vulnérables.',
      coordinators: 'Performance et charge de travail des coordinateurs.',
      anomalies:    'Anomalies, incohérences et comportements inhabituels.',
    };

    const prompt = `Analyse les données et retourne STRICTEMENT un JSON valide.

DATA:
Patients: ${d.totalPatients}
Compliance today: ${d.complianceToday}% (hier: ${d.complianceYesterday}%)
Response rate: ${d.responseRate}%
Reminders: ${d.sentReminders}
Coordinateurs: ${d.totalCoordinators}
Alerts: ${d.alerts.length > 0 ? d.alerts.join(', ') : 'Aucune'}

FOCUS: ${focus[type] ?? focus['monthly']}
FORMAT STRICT JSON :
{
  "resume": "Phrase d'accroche professionnelle + contexte",
  "problemes": ["Problème 1 avec chiffre clé", "..."],
  "causes": ["Cause racine identifiée", "..."],
  "recommandations": ["Action concrète + priorité + délai", "..."]
}
NO TEXT OUTSIDE JSON.`;

    try {
      const raw    = await this.callAI(prompt);
      const report = this.cleanJson(raw);
      return { type, report, data: d, generatedAt: new Date().toISOString() };
    } catch (err: any) {
      this.logger.error(err.message);
      return { type, report: { resume: 'AI indisponible', problemes: [], causes: [], recommandations: [] }, data: d, generatedAt: new Date().toISOString() };
    }
  }

  // ─── AUDITOR REPORT ───────────────────────────────────────────

  async generateAuditReport() {
    const since24h   = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000);
    const since3d    = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [total, last24h, deletions, criticals] = await Promise.all([
      this.auditLogModel.countDocuments(),
      this.auditLogModel.countDocuments({ createdAt: { $gte: since24h } }),
      this.auditLogModel.countDocuments({ action: { $in: ['DELETE', 'ARCHIVE'] }, createdAt: { $gte: since7d } }),
      this.auditLogModel.countDocuments({ action: { $in: ['DELETE', 'ARCHIVE', 'DEACTIVATE', 'RESET_PASSWORD'] }, createdAt: { $gte: since24h } }),
    ]);

    const topUsers = await this.auditLogModel.aggregate([
      { $match: { createdAt: { $gte: since7d }, userEmail: { $nin: ['anonymous', null, ''] } } },
      { $group: { _id: '$userEmail', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 },
    ]);

    const coordRole    = await this.roleModel.findOne({ name: 'coordinator' }).lean();
    const coordinators = coordRole ? await this.userModel.find({ role: coordRole._id, isArchived: { $ne: true } }).lean() : [];
    // Use createdAt instead of sentAt — scheduled reminders don't have sentAt set
    const activeCoordIds = await this.reminderModel.distinct('sentBy', { createdAt: { $gte: since3d } });
    const inactiveCoords = (coordinators as any[]).filter(c => !activeCoordIds.map((id: any) => id.toString()).includes(c._id.toString()));

    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    const patients    = patientRole ? await this.userModel.find({ role: patientRole._id, isArchived: { $ne: true } }).lean() : [];
    const patientIds  = (patients as any[]).map(p => p._id);

    const [vitalsToday, symptomsToday] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
    ]);

    const vitalSet    = new Set((vitalsToday   as any[]).map((v: any) => v.patientId?.toString()));
    const symptomSet  = new Set((symptomsToday as any[]).map((s: any) => s.patientId?.toString()));
    const noDataCount = (patients as any[]).filter(p => !vitalSet.has(p._id.toString()) && !symptomSet.has(p._id.toString())).length;

    const data = {
      totalAuditLogs: total, last24hEvents: last24h, deletionsLast7d: deletions, criticalActionsLast24h: criticals,
      topActiveUsers: topUsers.map((u: any) => `${u._id ?? 'unknown'} — ${u.count} actions`),
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

    const prompt = `Tu es un auditeur médical expert. Analyse ces données et retourne STRICTEMENT un JSON valide sans aucun texte avant ou après.

DONNÉES SYSTÈME:
- Total logs audit: ${data.totalAuditLogs} | Activité 24h: ${data.last24hEvents} événements
- Suppressions/Archives (7j): ${data.deletionsLast7d} | Actions critiques (24h): ${data.criticalActionsLast24h}
- Coordinateurs inactifs (3j sans reminder): ${data.inactiveCoordinators}/${(coordinators as any[]).length} — ${data.inactiveCoordNames.join(', ') || 'aucun'}
- Patients sans données aujourd'hui: ${data.noDataToday}/${data.totalPatients}
- Top utilisateurs actifs: ${data.topActiveUsers.join(' | ') || 'aucun'}
- Risk Score calculé: ${riskScore}/100 (${riskLevel})

INSTRUCTIONS:
- resume: 1 phrase résumant la situation globale
- alertes: liste des problèmes urgents nécessitant action immédiate (max 4)
- risques: liste des risques potentiels identifiés (max 3)
- interpretation: paragraphe de 2-3 phrases analysant les tendances, causes probables et impact sur la qualité des soins
- actions: liste de recommandations concrètes prioritaires (max 4)
- topUsers: liste des utilisateurs à surveiller avec leur activité

FORMAT JSON STRICT (NO TEXT OUTSIDE):
{"riskScore":${riskScore},"riskLevel":"${riskLevel}","resume":"...","alertes":["🚨 ..."],"risques":["⚠️ ..."],"interpretation":"...","actions":["✅ ..."],"topUsers":["..."]}`;

    try {
      const raw    = await this.callAI(prompt);
      const report = this.cleanJson(raw);

      // Sanitize arrays — ensure all items are strings (AI sometimes returns objects)
      const sanitizeArr = (arr: any[]): string[] =>
        (arr || []).map(item =>
          typeof item === 'string' ? item :
          typeof item === 'object' && item !== null
            ? (item.email ?? item.name ?? item.text ?? item.label ?? JSON.stringify(item))
            : String(item ?? '')
        ).filter(Boolean);

      report.alertes  = sanitizeArr(report.alertes);
      report.risques  = sanitizeArr(report.risques);
      report.actions  = sanitizeArr(report.actions);
      report.topUsers = sanitizeArr(report.topUsers);

      return { report: { ...report, riskScore, riskLevel }, data, generatedAt: new Date().toISOString() };
    } catch (err: any) {
      this.logger.error(err.message);
      return { report: { resume: 'AI indisponible', riskScore, riskLevel, alertes: [], risques: [], interpretation: '', actions: [], topUsers: [] }, data, generatedAt: new Date().toISOString() };
    }
  }

  // ─── AUDITOR REPORTS ─────────────────────────────────────────

  async generateDailyAuditReport() {
    const since24h   = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const [total24h, byAction, byUser, criticals, logins, deletions] = await Promise.all([
      this.auditLogModel.countDocuments({ createdAt: { $gte: since24h } }),
      this.auditLogModel.aggregate([
        { $match: { createdAt: { $gte: since24h } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.auditLogModel.aggregate([
        { $match: { createdAt: { $gte: since24h }, userEmail: { $nin: ['anonymous', null, ''] } } },
        { $group: { _id: '$userEmail', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      this.auditLogModel.countDocuments({ createdAt: { $gte: since24h }, action: { $in: ['DELETE', 'ARCHIVE', 'DEACTIVATE', 'RESET_PASSWORD'] } }),
      this.auditLogModel.countDocuments({ createdAt: { $gte: since24h }, action: 'LOGIN' }),
      this.auditLogModel.countDocuments({ createdAt: { $gte: since24h }, action: { $in: ['DELETE', 'ARCHIVE'] } }),
    ]);

    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    const patients = patientRole ? await this.userModel.find({ role: (patientRole as any)._id, isArchived: { $ne: true } }).lean() : [];
    const patientIds = (patients as any[]).map(p => p._id);
    const [vitalsToday, symptomsToday] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
    ]);
    const vitalSet   = new Set((vitalsToday as any[]).map((v: any) => v.patientId?.toString()));
    const symptomSet = new Set((symptomsToday as any[]).map((s: any) => s.patientId?.toString()));
    const compliantToday = (patients as any[]).filter(p => vitalSet.has(p._id.toString()) && symptomSet.has(p._id.toString())).length;
    const complianceRate = patients.length ? Math.round(compliantToday / patients.length * 100) : 0;

    const data = {
      date: new Date().toLocaleDateString('fr-FR'),
      totalEvents: total24h, criticalActions: criticals, logins, deletions,
      topUsers: (byUser as any[]).map((u: any) => `${u._id} (${u.count} actions)`),
      actionBreakdown: (byAction as any[]).map((a: any) => `${a._id}: ${a.count}`).join(', '),
      totalPatients: patients.length, compliantToday, complianceRate,
    };

    const prompt = `Tu es un auditeur médical. Génère un rapport d'audit journalier professionnel en JSON strict.

DONNÉES DU JOUR (${data.date}):
- Événements système: ${data.totalEvents} | Actions critiques: ${data.criticalActions}
- Connexions: ${data.logins} | Suppressions/Archives: ${data.deletions}
- Répartition: ${data.actionBreakdown}
- Utilisateurs actifs: ${data.topUsers.join(' | ') || 'aucun'}
- Compliance patients: ${data.compliantToday}/${data.totalPatients} (${data.complianceRate}%)

FORMAT JSON STRICT:
{"title":"Rapport d'Audit Journalier — ${data.date}","summary":"...","highlights":["..."],"concerns":["..."],"recommendations":["..."],"complianceRate":${data.complianceRate},"criticalCount":${data.criticalActions},"totalEvents":${data.totalEvents}}`;

    try {
      const raw = await this.callAI(prompt);
      const report = this.cleanJson(raw);
      return { type: 'daily', report, data, generatedAt: new Date().toISOString() };
    } catch {
      return { type: 'daily', report: { title: `Rapport Journalier — ${data.date}`, summary: `${data.totalEvents} événements, ${data.criticalActions} critiques, compliance ${data.complianceRate}%.`, highlights: [], concerns: [], recommendations: [], complianceRate: data.complianceRate, criticalCount: data.criticalActions, totalEvents: data.totalEvents }, data, generatedAt: new Date().toISOString() };
    }
  }

  async generateMonthlyComplianceReport() {
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    const coordRole   = await this.roleModel.findOne({ name: 'coordinator' }).lean();
    const patients    = patientRole ? await this.userModel.find({ role: (patientRole as any)._id, isArchived: { $ne: true } }).lean() : [];
    const coordinators = coordRole ? await this.userModel.find({ role: (coordRole as any)._id, isArchived: { $ne: true } }).lean() : [];
    const patientIds  = (patients as any[]).map(p => p._id);

    const [vitals30d, symptoms30d, reminders30d, auditEvents] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: since30d } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: since30d } }).lean(),
      this.reminderModel.find({ createdAt: { $gte: since30d } }).lean(),
      this.auditLogModel.countDocuments({ createdAt: { $gte: since30d } }),
    ]);

    const vitalPatients   = new Set((vitals30d as any[]).map((v: any) => v.patientId?.toString()));
    const symptomPatients = new Set((symptoms30d as any[]).map((s: any) => s.patientId?.toString()));
    const activePatients  = (patients as any[]).filter(p => vitalPatients.has(p._id.toString()) || symptomPatients.has(p._id.toString())).length;
    const sentReminders   = (reminders30d as any[]).filter((r: any) => r.status === 'sent').length;
    const complianceRate  = patients.length ? Math.round(activePatients / patients.length * 100) : 0;

    const data = {
      month: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
      totalPatients: patients.length, activePatients, complianceRate,
      totalCoordinators: coordinators.length,
      vitalsSubmitted: vitals30d.length, symptomsSubmitted: symptoms30d.length,
      remindersSent: sentReminders, totalReminders: reminders30d.length,
      auditEvents,
    };

    const prompt = `Tu es un auditeur médical. Génère un rapport de compliance mensuel professionnel en JSON strict.

DONNÉES DU MOIS (${data.month}):
- Patients actifs: ${data.activePatients}/${data.totalPatients} (${data.complianceRate}% compliance)
- Coordinateurs: ${data.totalCoordinators}
- Vitaux soumis: ${data.vitalsSubmitted} | Symptômes soumis: ${data.symptomsSubmitted}
- Rappels envoyés: ${data.remindersSent}/${data.totalReminders}
- Événements audit: ${data.auditEvents}

FORMAT JSON STRICT:
{"title":"Rapport de Compliance Mensuel — ${data.month}","executiveSummary":"...","complianceAnalysis":"...","strengths":["..."],"weaknesses":["..."],"recommendations":["..."],"kpis":{"complianceRate":${data.complianceRate},"activePatients":${data.activePatients},"remindersSent":${data.remindersSent}}}`;

    try {
      const raw = await this.callAI(prompt);
      const report = this.cleanJson(raw);
      return { type: 'monthly', report, data, generatedAt: new Date().toISOString() };
    } catch {
      return { type: 'monthly', report: { title: `Rapport Mensuel — ${data.month}`, executiveSummary: `Compliance ${data.complianceRate}% sur ${data.totalPatients} patients.`, complianceAnalysis: '', strengths: [], weaknesses: [], recommendations: [], kpis: { complianceRate: data.complianceRate, activePatients: data.activePatients, remindersSent: data.remindersSent } }, data, generatedAt: new Date().toISOString() };
    }
  }

  async generateSuspiciousActivityReport() {
    const since7d  = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [suspiciousLogs, criticalLogs, topAnonymous, multiIpUsers, massDeletes] = await Promise.all([
      this.auditLogModel.find({ riskLevel: { $in: ['SUSPICIOUS', 'CRITICAL'] }, createdAt: { $gte: since7d } }).sort({ createdAt: -1 }).limit(20).lean(),
      this.auditLogModel.find({ action: { $in: ['DELETE', 'ARCHIVE', 'DEACTIVATE', 'RESET_PASSWORD'] }, createdAt: { $gte: since24h } }).lean(),
      this.auditLogModel.countDocuments({ userEmail: 'anonymous', createdAt: { $gte: since7d } }),
      this.auditLogModel.aggregate([
        { $match: { createdAt: { $gte: since7d }, userEmail: { $nin: ['anonymous', null, ''] } } },
        { $group: { _id: '$userEmail', ips: { $addToSet: '$ipAddress' }, count: { $sum: 1 } } },
        { $match: { $expr: { $gt: [{ $size: '$ips' }, 2] } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
      this.auditLogModel.aggregate([
        { $match: { action: { $in: ['DELETE', 'ARCHIVE'] }, createdAt: { $gte: since7d } } },
        { $group: { _id: '$userEmail', count: { $sum: 1 } } },
        { $match: { count: { $gte: 3 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const data = {
      period: '7 derniers jours',
      suspiciousCount: suspiciousLogs.length,
      criticalCount24h: criticalLogs.length,
      anonymousActions: topAnonymous,
      multiIpUsers: (multiIpUsers as any[]).map((u: any) => `${u._id} (${u.ips.length} IPs, ${u.count} actions)`),
      massDeleteUsers: (massDeletes as any[]).map((u: any) => `${u._id} (${u.count} suppressions)`),
      topSuspicious: (suspiciousLogs as any[]).slice(0, 5).map((l: any) => `${l.userEmail} — ${l.action} sur ${l.entityType}`),
    };

    const prompt = `Tu es un expert en sécurité médicale. Génère un rapport d'activités suspectes en JSON strict.

DONNÉES (${data.period}):
- Événements suspects/critiques: ${data.suspiciousCount}
- Actions critiques 24h: ${data.criticalCount24h}
- Actions anonymes: ${data.anonymousActions}
- Utilisateurs multi-IP: ${data.multiIpUsers.join(' | ') || 'aucun'}
- Suppressions massives: ${data.massDeleteUsers.join(' | ') || 'aucun'}
- Top événements suspects: ${data.topSuspicious.join(' | ') || 'aucun'}

FORMAT JSON STRICT:
{"title":"Rapport d'Activités Suspectes — ${data.period}","riskLevel":"${data.suspiciousCount > 10 ? 'HIGH' : data.suspiciousCount > 3 ? 'MEDIUM' : 'LOW'}","summary":"...","threats":["..."],"suspiciousUsers":["..."],"recommendations":["..."],"immediateActions":["..."]}`;

    try {
      const raw = await this.callAI(prompt);
      const report = this.cleanJson(raw);
      return { type: 'suspicious', report, data, generatedAt: new Date().toISOString() };
    } catch {
      return { type: 'suspicious', report: { title: `Rapport Activités Suspectes — ${data.period}`, riskLevel: data.suspiciousCount > 10 ? 'HIGH' : 'LOW', summary: `${data.suspiciousCount} événements suspects détectés.`, threats: [], suspiciousUsers: [], recommendations: [], immediateActions: [] }, data, generatedAt: new Date().toISOString() };
    }
  }

  // ─── CALL AI (Gemini → Groq fallback) ────────────────────────

  private async callAI(prompt: string): Promise<string> {
    // Try Gemini first
    if (this.geminiClient) {
      try {
        const res  = await this.geminiClient.models.generateContent({ model: this.geminiModel, contents: prompt, temperature: 0.2 });
        const text = this.extractGeminiText(res).trim();
        if (text) return text;
      } catch {
        this.logger.warn('Gemini failed, falling back to Groq');
      }
    }



    // Fallback: Groq
    const groqKey = this.config.get<string>('GROQ_API_KEY');
    if (!groqKey) return '';

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.2 }),
    });
    const data: any = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  // ─── HELPERS ──────────────────────────────────────────────────

  private cleanJson(text: string) {
    try {
      // Try direct parse first
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from text
      try {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      } catch { /* ignore */ }
      this.logger.error('JSON parse failed, raw:', text?.slice(0, 200));
      return { resume: 'Erreur de parsing AI', problemes: [], causes: [], recommandations: [] };
    }
  }

  private fallbackReply(): string {
    return `Je suis désolé, le service d'assistance n'est pas disponible. Contactez votre professionnel de santé si vos symptômes s'aggravent.`;
  }

  private extractGeminiText(res: any): string {
    try {
      return res?.candidates?.[0]?.content?.parts?.[0]?.text
        || res?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('')
        ''
      
    } catch { return ''; }
  }

  // ─── STROKE RISK PREDICTION (ML Service) ────────────────────

  async predictStrokeRisk(patientId: string) {
    const patient = await this.userModel.findById(patientId).lean();
    if (!patient) throw new Error('Patient not found');

    const latestVital = await this.vitalModel
      .findOne({ patientId: (patient as any)._id })
      .sort({ recordedAt: -1 })
      .lean();

    // ── Age: stored field first, fallback to dateOfBirth calc ──
    const storedAge = (patient as any).age;
    const dob       = (patient as any).dateOfBirth;
    const age: number = storedAge
      ? Number(storedAge)
      : dob
        ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : 50;

    // ── BMI: weight only (no height field in schema — assume 1.75m) ──
    const weight  = (latestVital as any)?.weight;
    const bmi: number = weight ? parseFloat((weight / (1.75 ** 2)).toFixed(1)) : 28;

    // ── Blood pressure: handle both legacy & standard field names ──
    const systolic: number =
      (latestVital as any)?.bloodPressureSystolic ||
      (latestVital as any)?.bloodPressuresystolic ||
      0;

    // ── Glucose: bloodGlucose (mg/dL) preferred; glucoseLevel is g/L → ×100 ──
    const glucoseRaw: number | undefined =
      (latestVital as any)?.bloodGlucose ??
      ((latestVital as any)?.glucoseLevel != null
        ? Math.round((latestVital as any).glucoseLevel * 100)
        : undefined);
    const glucose: number = glucoseRaw ?? (age > 60 ? 180 : age > 45 ? 130 : 95);

    // ── Heart rate ──
    const heartRate: number = (latestVital as any)?.heartRate ?? 0;

    const mlInput = {
      age,
      gender:            (patient as any).gender === 'male' ? 'Male' : 'Female',
      hypertension:      systolic > 140 ? 1 : (age > 60 && systolic === 0 ? 1 : 0),
      heart_disease:     heartRate > 100 ? 1 : (age > 70 ? 1 : 0),
      ever_married:      age > 30 ? 'Yes' : 'No',   // maritalStatus not in schema
      work_type:         'Private',
      Residence_type:    'Urban',
      avg_glucose_level: glucose,
      bmi,
      smoking_status:    'Unknown',                  // smokingStatus not in schema
    };

    try {
      const res = await fetch('http://localhost:5001/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlInput),
      });
      if (!res.ok) throw new Error(`ML service HTTP ${res.status}`);
      const prediction = await res.json();
      return {
        patientId,
        patientName: `${(patient as any).firstName} ${(patient as any).lastName}`,
        mlInput,
        prediction,
        generatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(`ML prediction failed: ${err.message}`);
      return { patientId, error: 'ML service unavailable. Run: py app.py in ml-service/', mlInput };
    }
  }

  async predictAllPatientsRisk() {
    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    if (!patientRole) return [];

    const patients = await this.userModel
      .find({ role: patientRole._id, isArchived: { $ne: true } })
      .lean();

    const results = await Promise.all(
      (patients as any[]).map(p => this.predictStrokeRisk(p._id.toString()).catch(() => null))
    );

    return results
      .filter((r: any) => r?.prediction?.riskScore !== undefined)
      .sort((a: any, b: any) => b.prediction.riskScore - a.prediction.riskScore);
  }
}
