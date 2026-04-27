import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User, UserDocument } from '../users/users.schema';
import { Reminder, ReminderDocument } from './reminder.schema';
import { Role } from '../roles/role.schema';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class CoordinatorService {
  private readonly logger = new Logger(CoordinatorService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<any>,
    @InjectModel('VitalParameter') private readonly vitalModel: Model<any>,
    @InjectModel('Symptom') private readonly symptomModel: Model<any>,
    private readonly notificationService: NotificationService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private getDateRange(daysBack: number) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - daysBack);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  private checkVitalFields(doc: any): string[] {
  const missing: string[] = [];
  if (doc.temperature == null) missing.push('Temperature');
  if (doc.heartRate == null) missing.push('Heart Rate');
  const systolic = doc.bloodPressureSystolic ?? doc.bloodPressuresystolic;
  if (systolic == null || doc.bloodPressureDiastolic == null)
    missing.push('Blood Pressure');
  if (doc.weight == null) missing.push('Weight');
  if (doc.oxygenSaturation == null) missing.push('SpO2');
  if (doc.respiratoryRate == null) missing.push('Respiratory Rate');
  return missing;
}

  private checkSymptomFields(doc: any): string[] {
    const missing: string[] = [];
    if (doc.painLevel == null) missing.push('Pain Level');
    if (doc.fatigueLevel == null) missing.push('Fatigue Level');
    if (!doc.symptoms || (Array.isArray(doc.symptoms) && doc.symptoms.length === 0))
      missing.push('Symptoms List');
    return missing;
  }

  private async _getMissingFields(patientId: string): Promise<{
    missingVitals: string[];
    missingSymptoms: string[];
  }> {
    const { start, end } = this.getTodayRange();
    const pid = new Types.ObjectId(patientId);

    const [vitalDoc, symptomDoc] = await Promise.all([
      this.vitalModel.findOne({ patientId: pid, recordedAt: { $gte: start, $lte: end } }).lean(),
      this.symptomModel.findOne({ patientId: pid, reportedAt: { $gte: start, $lte: end } }).lean(),
    ]);

    const missingVitals = vitalDoc
  ? this.checkVitalFields(vitalDoc)
  : ['Temperature', 'Heart Rate', 'Blood Pressure', 'Weight', 'SpO2', 'Respiratory Rate'];

    const missingSymptoms = symptomDoc
      ? this.checkSymptomFields(symptomDoc)
      : ['Pain Level', 'Fatigue Level', 'Symptoms List'];

    return { missingVitals, missingSymptoms };
  }

  // ─── Message personnalisé selon champs manquants ──────────────

  buildPersonalizedMessage(
    patientName: string,
    missingVitals: string[],
    missingSymptoms: string[],
  ): string {
    const firstName = patientName.split(' ')[0];
    const allVitalsMissing = missingVitals.length === 4;
    const allSymptomsMissing = missingSymptoms.length === 3;
    const noVitalsAtAll = missingVitals.length === 4;
    const noSymptomsAtAll = missingSymptoms.length === 3;

    if (noVitalsAtAll && noSymptomsAtAll) {
      return `Dear ${firstName}, you have not submitted your daily health follow-up today. Please complete both your Vital Parameters and Symptoms report as soon as possible.`;
    }

    if (noVitalsAtAll && missingSymptoms.length === 0) {
      return `Dear ${firstName}, your vital signs have not been submitted today. Please complete your Vital Parameters (Temperature, Heart Rate, Blood Pressure, Weight).`;
    }

    if (noSymptomsAtAll && missingVitals.length === 0) {
      return `Dear ${firstName}, your symptoms report has not been submitted today. Please complete your Symptoms report (Pain Level, Fatigue Level, Symptoms List).`;
    }

    const parts: string[] = [];
    if (missingVitals.length > 0) {
      parts.push(`missing vital fields: ${missingVitals.join(', ')}`);
    }
    if (missingSymptoms.length > 0) {
      parts.push(`missing symptom fields: ${missingSymptoms.join(', ')}`);
    }

    return `Dear ${firstName}, your daily follow-up is incomplete — ${parts.join(' and ')}. Please submit the missing data as soon as possible.`;
  }

  // ─── Endpoint message personnalisé (appelé par le frontend) ──

  async getPersonalizedMessage(coordinatorId: string, patientId: string) {
    const patient = await this.userModel.findById(patientId).lean();
    if (!patient) throw new NotFoundException('Patient not found');

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const { missingVitals, missingSymptoms } = await this._getMissingFields(patientId);
    const message = this.buildPersonalizedMessage(patientName, missingVitals, missingSymptoms);

    return { message, missingVitals, missingSymptoms };
  }

  // ─── DASHBOARD ───────────────────────────────────────────────

  async getDashboard(coordinatorId: string) {
    const coordinator = await this.userModel
      .findById(coordinatorId)
      .populate('assignedPatients')
      .exec();

    if (!coordinator) throw new NotFoundException('Coordinator not found');

    const patients = (coordinator.assignedPatients || []) as unknown as UserDocument[];
    const patientIds = patients.map((p) => p._id as Types.ObjectId);

    const departmentMap: Record<string, number> = {};
    let completeProfiles = 0;
    let missingEmergencyContact = 0;
    let patientsWithMedicalRecord = 0;

    for (const patient of patients) {
      const dept = patient.department || 'Unknown';
      departmentMap[dept] = (departmentMap[dept] || 0) + 1;
      const isComplete =
        !!patient.phone && !!patient.address && !!patient.emergencyContact && !!patient.email;
      if (isComplete) completeProfiles++;
      if (!patient.emergencyContact) missingEmergencyContact++;
      if (patient.medicalRecordNumber) patientsWithMedicalRecord++;
    }

    const { start: todayStart, end: todayEnd } = this.getTodayRange();

    const remindersSentToday = await this.reminderModel.countDocuments({
      sentBy: new Types.ObjectId(coordinatorId),
      status: 'sent',
      sentAt: { $gte: todayStart, $lte: todayEnd },
    });

    const pendingReminders = await this.reminderModel.countDocuments({
      sentBy: new Types.ObjectId(coordinatorId),
      status: 'scheduled',
    });

    const complianceResults = await this._computeComplianceForPatients(patients, patientIds);
    const missingVitalsToday = complianceResults.filter((r) => !r.vitalsFullyComplete).length;
    const missingSymptomsToday = complianceResults.filter((r) => !r.symptomsFullyComplete).length;

    return {
      summary: {
        totalAssignedPatients: patients.length,
        departmentsCovered: Object.keys(departmentMap).length,
        completeProfiles,
        missingEmergencyContact,
        patientsWithMedicalRecord,
        remindersSentToday,
        pendingReminders,
        missingVitalsToday,
        missingSymptomsToday,
      },
      departmentDistribution: Object.entries(departmentMap).map(([label, value]) => ({
        label,
        value,
      })),
      recentPatients: [...patients]
        .sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
        )
        .slice(0, 5)
        .map((p) => ({
          _id: p._id,
          name: `${p.firstName} ${p.lastName}`,
          email: p.email,
          department: p.department || 'Unknown',
          status: p.emergencyContact ? 'Complete' : 'Needs attention',
        })),
    };
  }

  // ─── Compliance ───────────────────────────────────────────────

  private async _computeComplianceForPatients(
    patients: UserDocument[],
    patientIds: Types.ObjectId[],
  ) {
    const { start, end } = this.getTodayRange();

    const [vitalDocs, symptomDocs] = await Promise.all([
      this.vitalModel
        .find({ patientId: { $in: patientIds }, recordedAt: { $gte: start, $lte: end } })
        .lean(),
      this.symptomModel
        .find({ patientId: { $in: patientIds }, reportedAt: { $gte: start, $lte: end } })
        .lean(),
    ]);

    return patients.map((p) => {
      const pid = p._id.toString();
      const vitalDoc = vitalDocs.find((v: any) => v.patientId?.toString() === pid);
      const symptomDoc = symptomDocs.find((s: any) => s.patientId?.toString() === pid);

      const missingVitalFields = vitalDoc
        ? this.checkVitalFields(vitalDoc)
        : ['Temperature', 'Heart Rate', 'Blood Pressure', 'Weight'];
      const missingSymptomFields = symptomDoc
        ? this.checkSymptomFields(symptomDoc)
        : ['Pain Level', 'Fatigue Level', 'Symptoms List'];

      const vitalsSubmitted = !!vitalDoc;
      const vitalsFullyComplete = vitalsSubmitted && missingVitalFields.length === 0;
      const symptomsSubmitted = !!symptomDoc;
      const symptomsFullyComplete = symptomsSubmitted && missingSymptomFields.length === 0;

      return {
        _id: p._id,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        department: p.department || 'Unknown',
        vitalsSubmitted,
        vitalsFullyComplete,
        missingVitalFields,
        symptomsSubmitted,
        symptomsFullyComplete,
        missingSymptomFields,
        isFullyCompliant: vitalsFullyComplete && symptomsFullyComplete,
      };
    });
  }

  async getAssignedPatients(coordinatorId: string) {
    const coordinator = await this.userModel
      .findById(coordinatorId)
      .populate('assignedPatients')
      .exec();

    if (!coordinator) throw new NotFoundException('Coordinator not found');

    const patients = (coordinator.assignedPatients || []) as unknown as UserDocument[];

    return patients.map((p) => ({
      _id: p._id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      phone: p.phone || '',
      department: p.department || 'Unknown',
      medicalRecordNumber: p.medicalRecordNumber || '',
      status: p.emergencyContact ? 'Complete' : 'Needs attention',
    }));
  }

  async getComplianceToday(coordinatorId: string) {
    const coordinator = await this.userModel
      .findById(coordinatorId)
      .populate('assignedPatients')
      .exec();

    if (!coordinator) throw new NotFoundException('Coordinator not found');

    const patients = (coordinator.assignedPatients || []) as unknown as UserDocument[];
    const patientIds = patients.map((p) => p._id as Types.ObjectId);

    return this._computeComplianceForPatients(patients, patientIds);
  }

  // ─── PREDICTION ──────────────────────────────────────────────

  async getPrediction(coordinatorId: string) {
    const coordinator = await this.userModel
      .findById(coordinatorId)
      .populate('assignedPatients')
      .exec();

    if (!coordinator) throw new NotFoundException('Coordinator not found');

    const patients = (coordinator.assignedPatients || []) as unknown as UserDocument[];
    const patientIds = patients.map((p) => p._id as Types.ObjectId);
    const { start, end } = this.getDateRange(14);

    const [vitalHistory, symptomHistory] = await Promise.all([
      this.vitalModel
        .find({ patientId: { $in: patientIds }, recordedAt: { $gte: start, $lte: end } })
        .lean(),
      this.symptomModel
        .find({ patientId: { $in: patientIds }, reportedAt: { $gte: start, $lte: end } })
        .lean(),
    ]);

    const patientStats = patients.map((p) => {
      const pid = p._id.toString();
      const patientVitals = vitalHistory.filter((v: any) => v.patientId?.toString() === pid);
      const patientSymptoms = symptomHistory.filter(
        (s: any) => s.patientId?.toString() === pid,
      );

      const vitalDays = new Set(
        patientVitals.map((v: any) => new Date(v.recordedAt).toISOString().split('T')[0]),
      );
      const symptomDays = new Set(
        patientSymptoms.map((s: any) => new Date(s.reportedAt).toISOString().split('T')[0]),
      );

      const allDays = new Set([...vitalDays, ...symptomDays]);
      const fullComplianceDays = [...allDays].filter(
        (d) => vitalDays.has(d) && symptomDays.has(d),
      ).length;
      const complianceRate = Math.round((fullComplianceDays / 14) * 100);

      let consecutiveMissingDays = 0;
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dayKey = d.toISOString().split('T')[0];
        if (!vitalDays.has(dayKey) && !symptomDays.has(dayKey)) consecutiveMissingDays++;
        else break;
      }

      const allSubmissionDates = [
        ...patientVitals.map((v: any) => new Date(v.recordedAt).getTime()),
        ...patientSymptoms.map((s: any) => new Date(s.reportedAt).getTime()),
      ];
      const lastSubmission =
        allSubmissionDates.length > 0
          ? new Date(Math.max(...allSubmissionDates)).toISOString()
          : null;

      let riskScore = 0;
      if (complianceRate < 30) riskScore += 50;
      else if (complianceRate < 60) riskScore += 30;
      else if (complianceRate < 80) riskScore += 15;
      if (consecutiveMissingDays >= 3) riskScore += 40;
      else if (consecutiveMissingDays >= 2) riskScore += 25;
      else if (consecutiveMissingDays >= 1) riskScore += 10;
      if (!lastSubmission) riskScore += 10;
      riskScore = Math.min(riskScore, 100);

      let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
      if (riskScore >= 60) riskLevel = 'HIGH';
      else if (riskScore >= 30) riskLevel = 'MEDIUM';
      else riskLevel = 'LOW';

      return {
        patientId: pid,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        department: p.department || 'Unknown',
        complianceRate,
        consecutiveMissingDays,
        lastSubmission,
        totalVitalSubmissions: patientVitals.length,
        totalSymptomSubmissions: patientSymptoms.length,
        riskScore,
        riskLevel,
        vitalDaysCount: vitalDays.size,
        symptomDaysCount: symptomDays.size,
      };
    });

    patientStats.sort((a, b) => b.riskScore - a.riskScore);
    return {
      generatedAt: new Date().toISOString(),
      periodDays: 14,
      patients: patientStats,
    };
  }

  // ─── AUDITOR: AI INSIGHTS ────────────────────────────────────

  async getAiInsights() {
    const insights: { level: 'critical' | 'warning' | 'info' | 'success'; icon: string; title: string; detail: string }[] = [];

    // Resolve roles
    const [patientRole, coordRole] = await Promise.all([
      this.roleModel.findOne({ name: 'patient' }).lean(),
      this.roleModel.findOne({ name: 'coordinator' }).lean(),
    ]);

    if (!patientRole || !coordRole) return insights;

    const [patients, coordinators] = await Promise.all([
      this.userModel.find({ role: patientRole._id, isArchived: { $ne: true } }).lean(),
      this.userModel.find({ role: coordRole._id,   isArchived: { $ne: true } }).lean(),
    ]);

    const patientIds  = patients.map((p) => p._id as Types.ObjectId);
    const coordIds    = coordinators.map((c) => c._id as Types.ObjectId);
    const { start: todayStart, end: todayEnd } = this.getTodayRange();
    const { start: week3Start } = this.getDateRange(3);

    // Fetch vitals, symptoms, reminders in parallel
    const [vitalDocs, symptomDocs, recentReminders, allReminders] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: todayStart, $lte: todayEnd } }).lean(),
      this.reminderModel.find({ sentBy: { $in: coordIds }, sentAt: { $gte: week3Start } }).lean(),
      this.reminderModel.find({ sentBy: { $in: coordIds } }).lean(),
    ]);

    const vitalSet   = new Set(vitalDocs.map((v: any) => v.patientId?.toString()));
    const symptomSet = new Set(symptomDocs.map((s: any) => s.patientId?.toString()));

    // ── Insight 1: Compliance rate ────────────────────────────
    const okCount = patients.filter((p) => {
      const pid = (p._id as any).toString();
      return vitalSet.has(pid) && symptomSet.has(pid);
    }).length;
    const complianceRate = patients.length > 0 ? Math.round((okCount / patients.length) * 100) : 0;

    if (complianceRate < 30) {
      insights.push({ level: 'critical', icon: 'alert-octagon', title: 'Compliance critique', detail: `Seulement ${complianceRate}% des patients ont soumis leurs données aujourd'hui.` });
    } else if (complianceRate < 60) {
      insights.push({ level: 'warning', icon: 'alert-triangle', title: 'Compliance faible', detail: `${complianceRate}% de compliance aujourd'hui — ${patients.length - okCount} patients sans données.` });
    } else {
      insights.push({ level: 'success', icon: 'circle-check', title: 'Bonne compliance', detail: `${complianceRate}% des patients ont soumis leurs données aujourd'hui.` });
    }

    // ── Insight 2: Patients NO DATA ───────────────────────────
    const noDataPatients = patients.filter((p) => {
      const pid = (p._id as any).toString();
      return !vitalSet.has(pid) && !symptomSet.has(pid);
    });
    if (noDataPatients.length > 0) {
      insights.push({ level: noDataPatients.length > 5 ? 'critical' : 'warning', icon: 'user-off', title: `${noDataPatients.length} patient(s) sans données`, detail: `Aucune soumission de vitaux ni symptômes aujourd'hui pour ${noDataPatients.length} patient(s).` });
    }

    // ── Insight 3: Coordinators inactifs (0 reminders last 3 days) ─
    const activeCoordIds = new Set(recentReminders.map((r: any) => r.sentBy?.toString()));
    const inactiveCoords = coordinators.filter((c) => !activeCoordIds.has((c._id as any).toString()));
    if (inactiveCoords.length > 0) {
      const names = inactiveCoords.slice(0, 2).map((c: any) => `${c.firstName} ${c.lastName}`).join(', ');
      insights.push({ level: 'warning', icon: 'users-group', title: `${inactiveCoords.length} coordinateur(s) inactif(s)`, detail: `Aucun reminder envoyé depuis 3 jours: ${names}${inactiveCoords.length > 2 ? '...' : ''}.` });
    }

    // ── Insight 4: Coordinator avec completeness < 40% ────────
    const lowCompletenessCoords = coordinators.filter((c) => {
      const cid = (c._id as any).toString();
      const myPatients = patients.filter((p: any) => p.coordinatorId?.toString() === cid);
      if (myPatients.length === 0) return false;
      const complete = myPatients.filter((p: any) => p.phone && p.address && p.emergencyContact).length;
      return Math.round((complete / myPatients.length) * 100) < 40;
    });
    if (lowCompletenessCoords.length > 0) {
      insights.push({ level: 'warning', icon: 'clipboard-x', title: 'Données patients incomplètes', detail: `${lowCompletenessCoords.length} coordinateur(s) ont moins de 40% de complétude des dossiers patients.` });
    }

    // ── Insight 5: Reminder success rate ─────────────────────
    const totalRem = allReminders.length;
    const sentRem  = allReminders.filter((r: any) => r.status === 'sent').length;
    const successRate = totalRem > 0 ? Math.round((sentRem / totalRem) * 100) : 100;
    if (totalRem > 0 && successRate < 50) {
      insights.push({ level: 'warning', icon: 'bell-x', title: 'Taux de reminders faible', detail: `Seulement ${successRate}% des reminders ont été envoyés (${sentRem}/${totalRem}).` });
    }

    // ── Insight 6: All good ───────────────────────────────────
    if (insights.filter(i => i.level === 'critical' || i.level === 'warning').length === 0) {
      insights.push({ level: 'success', icon: 'shield-check', title: 'Système stable', detail: 'Aucune anomalie détectée. Tous les indicateurs sont dans les normes.' });
    }

    return { generatedAt: new Date().toISOString(), complianceRate, insights };
  }

  // ─── AUDITOR: SERVICE STAFF OVERVIEW ────────────────────────

  async getServiceStaffOverview() {
    // Resolve role IDs
    const [doctorRole, nurseRole, patientRole] = await Promise.all([
      this.roleModel.findOne({ name: 'doctor' }).lean(),
      this.roleModel.findOne({ name: 'nurse' }).lean(),
      this.roleModel.findOne({ name: 'patient' }).lean(),
    ]);

    // Fetch all relevant users with serviceId
    const [doctors, nurses, patients] = await Promise.all([
      doctorRole  ? this.userModel.find({ role: doctorRole._id,  isArchived: { $ne: true } }).lean() : [],
      nurseRole   ? this.userModel.find({ role: nurseRole._id,   isArchived: { $ne: true } }).lean() : [],
      patientRole ? this.userModel.find({ role: patientRole._id, isArchived: { $ne: true } }).lean() : [],
    ]);

    // Group by serviceId (toString for safe comparison)
    const map = new Map<string, { doctors: any[]; nurses: any[]; patients: any[] }>();

    const ensure = (sid: string) => {
      if (!map.has(sid)) map.set(sid, { doctors: [], nurses: [], patients: [] });
      return map.get(sid)!;
    };

    doctors.forEach((u: any) => {
      const sid = u.serviceId?.toString();
      if (sid) ensure(sid).doctors.push({ _id: u._id, name: `${u.firstName} ${u.lastName}`, email: u.email });
    });
    nurses.forEach((u: any) => {
      const sid = u.serviceId?.toString();
      if (sid) ensure(sid).nurses.push({ _id: u._id, name: `${u.firstName} ${u.lastName}`, email: u.email });
    });
    patients.forEach((u: any) => {
      const sid = u.serviceId?.toString();
      if (sid) ensure(sid).patients.push({ _id: u._id, name: `${u.firstName} ${u.lastName}`, email: u.email });
    });

    return Array.from(map.entries()).map(([serviceId, staff]) => ({
      serviceId,
      doctorCount:  staff.doctors.length,
      nurseCount:   staff.nurses.length,
      patientCount: staff.patients.length,
      doctors:  staff.doctors,
      nurses:   staff.nurses,
      patients: staff.patients,
    }));
  }

  // ─── AUDITOR: ALL REMINDERS OVERVIEW ─────────────────────────

  async getAllRemindersOverview() {
    const allReminders = await this.reminderModel
      .find()
      .populate('patientId', 'firstName lastName email')
      .populate('sentBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    const total = allReminders.length;
    const sentCount = allReminders.filter((r: any) => r.status === 'sent').length;
    const scheduledCount = allReminders.filter((r: any) => r.status === 'scheduled').length;
    const cancelledCount = allReminders.filter((r: any) => r.status === 'cancelled').length;
    const successRate = total > 0 ? Math.round((sentCount / total) * 100) : 0;

    // Avg delay: sentAt - scheduledAt in minutes (only sent reminders with both dates)
    const sentWithDelay = allReminders.filter(
      (r: any) => r.status === 'sent' && r.sentAt && r.scheduledAt,
    );
    let avgDelayMin: number | null = null;
    if (sentWithDelay.length > 0) {
      const totalMs = sentWithDelay.reduce((sum: number, r: any) => {
        return sum + Math.max(0, new Date(r.sentAt).getTime() - new Date(r.scheduledAt).getTime());
      }, 0);
      avgDelayMin = Math.round(totalMs / sentWithDelay.length / 60000);
    }

    const rows = allReminders.map((r: any) => ({
      _id: r._id?.toString(),
      createdAt: r.createdAt,
      scheduledAt: r.scheduledAt,
      sentAt: r.sentAt,
      patientName: r.patientId ? `${r.patientId.firstName} ${r.patientId.lastName}` : '—',
      patientEmail: r.patientId?.email || '',
      coordinatorName: r.sentBy ? `${r.sentBy.firstName} ${r.sentBy.lastName}` : '—',
      coordinatorEmail: r.sentBy?.email || '',
      type: r.type,
      message: r.message,
      status: r.status,
      emailSent: r.emailSent,
      smsSent: r.smsSent,
    }));

    return {
      stats: { total, sentCount, scheduledCount, cancelledCount, successRate, avgDelayMin },
      reminders: rows,
    };
  }

  // ─── AUDITOR: PATIENTS OVERVIEW ──────────────────────────────

  async getPatientsOverview() {
    // 1. Resolve patient role _id
    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    if (!patientRole) return [];

    // 2. Fetch all non-archived patients
    const patients = await this.userModel
      .find({ role: patientRole._id, isArchived: { $ne: true } })
      .lean()
      .exec();

    if (patients.length === 0) return [];

    const patientIds = patients.map((p) => p._id as Types.ObjectId);
    const { start, end } = this.getTodayRange();

    // 3. Fetch today's vitals + symptoms in parallel
    const [vitalDocs, symptomDocs, coordinators] = await Promise.all([
      this.vitalModel
        .find({ patientId: { $in: patientIds }, recordedAt: { $gte: start, $lte: end } })
        .lean(),
      this.symptomModel
        .find({ patientId: { $in: patientIds }, reportedAt: { $gte: start, $lte: end } })
        .lean(),
      this.userModel
        .find({ role: (await this.roleModel.findOne({ name: 'coordinator' }).lean())?._id })
        .lean()
        .exec(),
    ]);

    const vitalSet = new Set(vitalDocs.map((v: any) => v.patientId?.toString()));
    const symptomSet = new Set(symptomDocs.map((s: any) => s.patientId?.toString()));
    const coordMap = new Map(coordinators.map((c) => [(c._id as any).toString(), `${c.firstName} ${c.lastName}`]));

    return patients.map((p) => {
      const pid = (p._id as any).toString();
      const hasVitals = vitalSet.has(pid);
      const hasSymptoms = symptomSet.has(pid);
      const status: 'OK' | 'INCOMPLETE' | 'NO DATA' =
        hasVitals && hasSymptoms ? 'OK' : !hasVitals && !hasSymptoms ? 'NO DATA' : 'INCOMPLETE';

      return {
        _id: pid,
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        mrn: (p as any).medicalRecordNumber || '',
        department: (p as any).department || '',
        service: (p as any).assignedService || '',
        coordinatorName: coordMap.get((p as any).coordinatorId?.toString()) || '',
        vitalsToday: hasVitals,
        symptomsToday: hasSymptoms,
        status,
      };
    });
  }

  // ─── ALL COORDINATORS PERFORMANCE (for Auditor view) ─────────

  async getAllPerformance() {
    try {
      const coordRole = await this.roleModel.findOne({ name: 'coordinator' }).lean();
      this.logger.log(`[getAllPerformance] coordRole found: ${JSON.stringify(coordRole?._id ?? 'NOT FOUND')}`);
      if (!coordRole) return [];

      const coordinators = await this.userModel
        .find({ role: coordRole._id, isArchived: { $ne: true } })
        .lean()
        .exec();

      this.logger.log(`[getAllPerformance] coordinators found: ${coordinators.length}`);

      const { start: todayStart, end: todayEnd } = this.getTodayRange();
      const { start: weekStart } = this.getDateRange(7);

      const coordIds = coordinators.map((c) => (c._id as any).toString());

      // Fetch only users that have a coordinatorId set (= patients) + all reminders
      const [allPatients, allReminders] = await Promise.all([
        this.userModel
          .find({ coordinatorId: { $exists: true, $ne: null } })
          .lean()
          .exec(),
        this.reminderModel
          .find({ sentBy: { $in: coordinators.map((c) => c._id) } })
          .lean()
          .exec(),
      ]);

      const rows = coordinators.map((c) => {
        const cid = (c._id as any).toString();

        // Patients whose coordinatorId matches this coordinator's _id
        const myPatients = allPatients.filter(
          (p: any) => p.coordinatorId?.toString() === cid,
        );
        const patientCount = myPatients.length;

        // Completeness rate
        const completeCount = myPatients.filter(
          (p: any) => p.phone && p.address && p.emergencyContact,
        ).length;
        const completenessRate =
          patientCount > 0 ? Math.round((completeCount / patientCount) * 100) : 0;

        // Reminders
        const myReminders = allReminders.filter(
          (r: any) => r.sentBy?.toString() === cid,
        );
        const remindersSent = myReminders.filter((r: any) => r.status === 'sent').length;
        const remindersToday = myReminders.filter(
          (r: any) =>
            r.status === 'sent' &&
            r.sentAt &&
            new Date(r.sentAt) >= todayStart &&
            new Date(r.sentAt) <= todayEnd,
        ).length;

        // Avg response time (last 7 days)
        const recentSent = myReminders.filter(
          (r: any) =>
            r.status === 'sent' &&
            r.sentAt &&
            r.scheduledAt &&
            new Date(r.sentAt) >= weekStart,
        );
        let avgResponseMin: number | null = null;
        if (recentSent.length > 0) {
          const totalMs = recentSent.reduce((sum: number, r: any) => {
            const diff = new Date(r.sentAt).getTime() - new Date(r.scheduledAt).getTime();
            return sum + Math.max(0, diff);
          }, 0);
          avgResponseMin = Math.round(totalMs / recentSent.length / 60000);
        }

        return {
          _id: cid,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
          patientCount,
          completenessRate,
          remindersSent,
          remindersToday,
          avgResponseMin,
        };
      });

      // Rank by remindersSent desc
      rows.sort((a, b) => b.remindersSent - a.remindersSent);
      return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    } catch (err) {
      this.logger.error(`[getAllPerformance] ERROR: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ─── REMINDERS ───────────────────────────────────────────────

  async getReminders(coordinatorId: string) {
    return this.reminderModel
      .find({ sentBy: new Types.ObjectId(coordinatorId) })
      .populate('patientId', 'firstName lastName email emergencyContact')
      .sort({ createdAt: -1 })
      .exec();
  }

  // createReminder — crée uniquement, AUCUN email ni SMS
  async createReminder(
    coordinatorId: string,
    body: {
      patientId: string;
      type: string;
      message: string;
      scheduledAt?: string;
      status?: string;
    },
  ) {
    const reminder = new this.reminderModel({
      patientId: new Types.ObjectId(body.patientId),
      sentBy: new Types.ObjectId(coordinatorId),
      type: body.type,
      message: body.message,
      status: body.status || 'scheduled',
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : new Date(),
      emailSent: false,
      smsSent: false,
      smsJobDone: false,
    });

    return reminder.save();
  }

    // sendReminder — email immédiat quand coordinator clique Send
  async sendReminder(reminderId: string) {
    const reminder = await this.reminderModel
      .findById(reminderId)
      .populate('patientId', 'firstName lastName email emergencyContact')
      .exec();

    if (!reminder) throw new NotFoundException('Reminder not found');

    if (reminder.emailSent) {
      this.logger.warn(`Email already sent for reminder ${reminderId} — skipping`);
      reminder.status = 'sent';
      reminder.sentAt = new Date();
      return reminder.save();
    }

    reminder.status = 'sent';
    reminder.sentAt = new Date();
    await reminder.save();

    const patient = reminder.patientId as any;
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const patientId = patient._id.toString();

    const { missingVitals, missingSymptoms } = await this._getMissingFields(patientId);
    const personalizedMessage = this.buildPersonalizedMessage(patientName, missingVitals, missingSymptoms);

    if (patient.email) {
      const emailHtml = this.notificationService.buildEmailHtml(
        patientName, personalizedMessage, missingVitals, missingSymptoms,
      );
      const emailSent = await this.notificationService.sendEmail(
        patient.email,
        `MediFollow — Daily Health Reminder for ${patientName}`,
        emailHtml,
      );
      if (emailSent) {
        await this.reminderModel.findByIdAndUpdate(reminderId, {
          emailSent: true,
          emailSentAt: new Date(),
        });
        this.logger.log(`Email sent to ${patient.email} for ${patientName}`);
      }
    }

    return reminder;
  }


  

  async cancelReminder(reminderId: string) {
    const reminder = await this.reminderModel.findById(reminderId).exec();
    if (!reminder) throw new NotFoundException('Reminder not found');
    reminder.status = 'cancelled';
    return reminder.save();
  }

  async deleteReminder(reminderId: string) {
    const deleted = await this.reminderModel.findByIdAndDelete(reminderId).exec();
    if (!deleted) throw new NotFoundException('Reminder not found');
    return { message: 'Reminder deleted' };
  }

  async updateReminder(
    reminderId: string,
    body: { type: string; message: string; scheduledAt?: string },
  ) {
    const reminder = await this.reminderModel.findById(reminderId).exec();
    if (!reminder) throw new NotFoundException('Reminder not found');
    reminder.type = body.type;
    reminder.message = body.message;
    if (body.scheduledAt) reminder.scheduledAt = new Date(body.scheduledAt);
    return reminder.save();
  }
}
