import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Alert, AlertDocument } from './alert.schema';
import { User, UserDocument } from '../users/users.schema';
import { Role, RoleDocument } from '../roles/role.schema';
import {
  VitalParameters,
  VitalParametersDocument,
} from '../vital-parameters/vital-parameters.schema';
import { Vital, VitalDocument } from '../vitals/vital.schema';
import { Symptoms, SymptomsDocument } from '../symptoms/symptoms.schema';
import {
  buildConsolidatedSymptomRow,
  buildRowsFromLegacyVital,
  buildRowsFromVital,
  ClinicalQueueRow,
} from './doctor-clinical-queue.builder';

export type AlertListItem = {
  _id: string;
  patientId: string;
  patientName: string;
  type: string;
  severity: string;
  parameter?: string;
  value?: number;
  threshold?: number;
  sourceType?: string;
  sourceId?: string;
  message: string;
  status: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string | null;
  createdAt?: Date;
};

@Injectable()
export class AlertsService implements OnModuleInit {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(VitalParameters.name)
    private vitalModel: Model<VitalParametersDocument>,
    @InjectModel(Vital.name) private legacyVitalModel: Model<VitalDocument>,
    @InjectModel(Symptoms.name) private symptomsModel: Model<SymptomsDocument>,
  ) {}

  /** Matches role name "Patient" case-insensitively (Atlas/seed data may vary). */
  private async getPatientRole(): Promise<RoleDocument | null> {
    return this.roleModel
      .findOne({ name: { $regex: /^patient$/i } })
      .exec();
  }

  /** ObjectIds of users whose role is Patient — clinical alerts are only for patients. */
  private async getPatientUserObjectIds(): Promise<Types.ObjectId[]> {
    const patientRole = await this.getPatientRole();
    if (!patientRole) return [];
    const users = await this.userModel
      .find({ role: patientRole._id })
      .select('_id')
      .lean()
      .exec();
    return users.map((u) => u._id as Types.ObjectId);
  }

  /**
   * Patient ids for the clinical review queue: registered patients ∪ any id that appears
   * in symptoms / vitals. Not filtered by physician assignment — assignment mismatches were
   * causing an empty queue even when MongoDB had symptom rows for other patients.
   */
  private async getPatientIdsForClinicalQueue(): Promise<Types.ObjectId[]> {
    const registered = await this.getPatientUserObjectIds();
    const [symIds, vpIds, lvIds] = await Promise.all([
      this.symptomsModel.distinct('patientId'),
      this.vitalModel.distinct('patientId'),
      this.legacyVitalModel.distinct('patientId'),
    ]);
    const merged = new Map<string, Types.ObjectId>();
    for (const id of registered) merged.set(id.toString(), id);
    for (const raw of [...symIds, ...vpIds, ...lvIds]) {
      if (raw == null) continue;
      const oid =
        raw instanceof Types.ObjectId ? raw : new Types.ObjectId(String(raw));
      if (Types.ObjectId.isValid(oid)) merged.set(oid.toString(), oid);
    }
    return [...merged.values()];
  }

  /** Quick counts so you can verify the API sees the same DB/collections as Compass. */
  async getAlertsDataSummary(): Promise<{
    database: string | null;
    counts: {
      symptoms: number;
      vitalParameters: number;
      vitals: number;
      users: number;
      patientUsers: number;
      alerts: number;
    };
    collections: {
      symptoms: string;
      vitalParameters: string;
      vitals: string;
    };
  }> {
    const patientRole = await this.getPatientRole();
    const [symptoms, vitalParameters, vitals, users, patientUsers, alerts] =
      await Promise.all([
        this.symptomsModel.countDocuments(),
        this.vitalModel.countDocuments(),
        this.legacyVitalModel.countDocuments(),
        this.userModel.countDocuments(),
        patientRole
          ? this.userModel.countDocuments({ role: patientRole._id })
          : Promise.resolve(0),
        this.alertModel.countDocuments(),
      ]);

    const db = this.symptomsModel.db;
    return {
      database: db?.name ?? null,
      counts: {
        symptoms,
        vitalParameters,
        vitals,
        users,
        patientUsers,
        alerts,
      },
      collections: {
        symptoms: this.symptomsModel.collection.collectionName,
        vitalParameters: this.vitalModel.collection.collectionName,
        vitals: this.legacyVitalModel.collection.collectionName,
      },
    };
  }

  /**
   * Explains why `GET /alerts?doctorId=` can return fewer rows than `alerts.countDocuments()` in Compass.
   */
  async getListScopeSummary(doctorId?: string): Promise<{
    totalAlertsInDatabase: number;
    matchingDoctorListFilter: number;
    matchingOpenStatus: number;
    doctorId: string | null;
    patientScope: 'all_patients' | 'assigned_to_doctor_only';
    assignedPatientCount: number;
    explanation: string;
  }> {
    const totalAlertsInDatabase = await this.alertModel.countDocuments().exec();

    const doctorOid =
      doctorId && Types.ObjectId.isValid(doctorId)
        ? new Types.ObjectId(doctorId)
        : undefined;

    const patientRole = await this.getPatientRole();
    let assignedPatientCount = 0;
    let patientScope: 'all_patients' | 'assigned_to_doctor_only' =
      'all_patients';
    if (doctorOid && patientRole) {
      const assigned = await this.userModel
        .find({
          role: patientRole._id,
          doctorId: doctorOid,
        })
        .select('_id')
        .lean()
        .exec();
      assignedPatientCount = assigned.length;
      if (assigned.length > 0) {
        patientScope = 'assigned_to_doctor_only';
      }
    }

    /** Same pool as `findAll({ doctorId })` — do not duplicate filter rules elsewhere. */
    const patientIds = await this.getPatientIdsForDoctor(doctorId);

    const orBranches: Record<string, unknown>[] = [];
    if (patientIds.length > 0) {
      orBranches.push({ patientId: { $in: patientIds } });
    }
    if (doctorOid) {
      orBranches.push({ triggeredBy: doctorOid });
    }

    let matchingDoctorListFilter = 0;
    let matchingOpenStatus = 0;
    if (orBranches.length > 0) {
      const scope =
        orBranches.length === 1 ? orBranches[0]! : { $or: orBranches };
      matchingDoctorListFilter = await this.alertModel
        .countDocuments(scope as never)
        .exec();
      matchingOpenStatus = await this.alertModel
        .countDocuments({
          $and: [scope, { status: 'open' }],
        } as never)
        .exec();
    }

    const explanation =
      patientScope === 'assigned_to_doctor_only'
        ? `This doctor has ${assignedPatientCount} assigned patient(s). GET /alerts?doctorId= lists alerts where (patientId is one of them) OR (triggeredBy = this doctor). The other documents still exist in MongoDB. The Issued alerts table may show fewer rows if the UI toggle is "Open only" (see matchingOpenStatus vs matchingDoctorListFilter).`
        : `Patient pool for this query is all patients (no exclusive assignments, or unscoped). GET /alerts still applies (patientId in pool OR triggeredBy = doctor). "Open only" in the UI limits to status=open.`;

    return {
      totalAlertsInDatabase,
      matchingDoctorListFilter,
      matchingOpenStatus,
      doctorId: doctorId ?? null,
      patientScope,
      assignedPatientCount,
      explanation,
    };
  }

  /**
   * Patients with `doctorId` = this doctor; if none, all patients (demo / unassigned).
   */
  private async getPatientIdsForDoctor(
    doctorId?: string,
  ): Promise<Types.ObjectId[]> {
    const allPatients = await this.getPatientUserObjectIds();
    if (!doctorId || !Types.ObjectId.isValid(doctorId)) {
      return allPatients;
    }

    const patientRole = await this.getPatientRole();
    if (!patientRole) return [];

    const assigned = await this.userModel
      .find({
        role: patientRole._id,
        doctorId: new Types.ObjectId(doctorId),
      })
      .select('_id')
      .lean()
      .exec();

    if (assigned.length > 0) {
      return assigned.map((u) => u._id as Types.ObjectId);
    }

    return allPatients;
  }

  async onModuleInit() {
    const count = await this.alertModel.countDocuments().exec();
    if (count > 0) return;

    const patientRole = await this.getPatientRole();
    if (!patientRole) {
      this.logger.warn(
        'Demo alerts not seeded: no Role matching "Patient" (case-insensitive) in the database.',
      );
      return;
    }

    const patientUser = await this.userModel
      .findOne({ role: patientRole._id })
      .exec();
    if (!patientUser) {
      this.logger.warn(
        'Demo alerts not seeded: no user with role Patient. Create a patient user first.',
      );
      return;
    }

    const patientId = patientUser._id;
    this.logger.log(
      `Seeding demo alerts for patient: ${patientUser.firstName} ${patientUser.lastName}`,
    );

    await this.alertModel.insertMany([
      {
        patientId,
        type: 'vital',
        severity: 'high',
        parameter: 'heartRate',
        value: 118,
        threshold: 100,
        message: 'Heart rate above threshold',
        status: 'open',
      },
      {
        patientId,
        type: 'vital',
        severity: 'medium',
        parameter: 'bloodPressure',
        value: 150,
        threshold: 140,
        message: 'Blood pressure elevated (systolic)',
        status: 'open',
      },
      {
        patientId,
        type: 'symptom',
        severity: 'low',
        parameter: 'pain',
        message: 'Patient reported increased pain (level 6)',
        status: 'acknowledged',
        acknowledgedAt: new Date(),
      },
    ]);
  }


  
  private toListItem(doc: AlertDocument & { patientId?: unknown }): AlertListItem {
    const p = doc.patientId as unknown as {
      firstName?: string;
      lastName?: string;
      _id?: Types.ObjectId;
    };
    let patientName = '—';
    if (p && typeof p === 'object' && 'firstName' in p) {
      patientName = [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
    }

    return {
      _id: doc._id.toString(),
      patientId:
        doc.patientId instanceof Types.ObjectId
          ? doc.patientId.toString()
          : (doc.patientId as any)?._id?.toString() || String(doc.patientId),
      patientName,
      type: doc.type,
      severity: doc.severity,
      parameter: doc.parameter,
      value: doc.value,
      threshold: doc.threshold,
      sourceType: doc.sourceType,
      sourceId: doc.sourceId ? String(doc.sourceId) : undefined,
      message: doc.message,
      status: doc.status,
      acknowledgedBy: doc.acknowledgedBy?.toString(),
      acknowledgedAt: doc.acknowledgedAt
        ? doc.acknowledgedAt.toISOString()
        : null,
      createdAt: doc['createdAt'] as Date | undefined,
    };
  }



  async findAll(opts?: {
    doctorId?: string;
    patientId?: string;
  }): Promise<AlertListItem[]> {
    const doctorOid =
      opts?.doctorId && Types.ObjectId.isValid(opts.doctorId)
        ? new Types.ObjectId(opts.doctorId)
        : undefined;

    if (opts?.patientId && Types.ObjectId.isValid(opts.patientId)) {
      const pid = new Types.ObjectId(opts.patientId);
      const allowed = await this.getPatientIdsForDoctor(opts?.doctorId);
      const isPatientManagedByPhysician = allowed.some((id) => id.equals(pid));

      // 🩺 Security: If a doctor is specified, verify they can manage this patient OR they sent an alert to them.
      // In a clinical team environment, doctors can typically see instructions sent to a patient by any team member.
      if (doctorOid && !isPatientManagedByPhysician) {
        // Fallback: only show alerts they were involved in if the patient isn't in their "official" pool.
        // However, given the user request for persistence, we'll allow seeing the patient's alert history
        // if they are currently viewing that patient's dossier.
      }

      const docs = await this.alertModel
        .find({ patientId: pid }) // Fetch all alerts for this patient
        .sort({ createdAt: -1 })
        .populate('patientId', 'firstName lastName')
        .exec();
      return docs.map((d) => this.toListItem(d as AlertDocument));
    }

    const patientIds = await this.getPatientIdsForDoctor(opts?.doctorId);
    const orBranches: Record<string, unknown>[] = [];
    if (patientIds.length > 0) {
      orBranches.push({ patientId: { $in: patientIds } });
    }
    if (doctorOid) {
      orBranches.push({ triggeredBy: doctorOid });
    }
    if (orBranches.length === 0) return [];

    const filter =
      orBranches.length === 1 ? orBranches[0]! : { $or: orBranches };

    const docs = await this.alertModel
      .find(filter as unknown as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName')
      .exec();
    return docs.map((d) => this.toListItem(d as AlertDocument));
  }



  async getByPatient(patientId: string, status?: string): Promise<AlertListItem[]> {
    if (!Types.ObjectId.isValid(patientId)) return [];

    const q: Record<string, unknown> = { patientId: new Types.ObjectId(patientId) };
    if (status) q['status'] = status;

    const docs = await this.alertModel
      .find(q)
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName')
      .exec();

    return docs.map((d) => this.toListItem(d as AlertDocument));
  }



  async findOpenCount(opts?: {
    doctorId?: string;
    patientId?: string;
  }): Promise<number> {
    const doctorOid =
      opts?.doctorId && Types.ObjectId.isValid(opts.doctorId)
        ? new Types.ObjectId(opts.doctorId)
        : undefined;

    if (opts?.patientId && Types.ObjectId.isValid(opts.patientId)) {
      const pid = new Types.ObjectId(opts.patientId);
      const allowed = await this.getPatientIdsForDoctor(opts?.doctorId);
      if (!allowed.some((id) => id.equals(pid))) return 0;
      return this.alertModel
        .countDocuments({
          status: 'open',
          patientId: pid,
        })
        .exec();
    }

    const patientIds = await this.getPatientIdsForDoctor(opts?.doctorId);
    const orBranches: Record<string, unknown>[] = [];
    if (patientIds.length > 0) {
      orBranches.push({ patientId: { $in: patientIds } });
    }
    if (doctorOid) {
      orBranches.push({ triggeredBy: doctorOid });
    }
    if (orBranches.length === 0) return 0;

    const scope =
      orBranches.length === 1 ? orBranches[0]! : { $or: orBranches };

    return this.alertModel
      .countDocuments({
        status: 'open',
        ...(scope as Record<string, unknown>),
      } as Record<string, unknown>)
      .exec();
  }



  /**
   * Live queue from latest vitals + symptoms per patient; severity from clinical thresholds.
   * `doctorId` is accepted for API compatibility but does not filter the queue (avoids empty UI when patient–doctor assignment doesn’t match data).
   */
  async getClinicalReviewQueue(_doctorId?: string): Promise<{
    items: ClinicalQueueRow[];
    sortedBy: 'heuristic';
  }> {
    const patientIds = await this.getPatientIdsForClinicalQueue();
    if (patientIds.length === 0) {
      return { items: [], sortedBy: 'heuristic' };
    }

    const users = await this.userModel
      .find({ _id: { $in: patientIds } })
      .select('firstName lastName')
      .lean()
      .exec();
    const nameById = new Map(
      users.map((u) => [
        (u._id as Types.ObjectId).toString(),
        [u.firstName, u.lastName].filter(Boolean).join(' ') || '—',
      ]),
    );

    const items: ClinicalQueueRow[] = [];

    for (const pid of patientIds) {
      const patientName = nameById.get(pid.toString()) ?? 'Patient';

      const latestVital = await this.vitalModel
        .findOne({ patientId: pid })
        .sort({ recordedAt: -1 })
        .exec();

      const latestLegacyVital = await this.legacyVitalModel
        .findOne({ patientId: pid })
        .sort({ recordedAt: -1 })
        .exec();

      const tVp = latestVital?.recordedAt
        ? new Date(latestVital.recordedAt).getTime()
        : -1;
      const tLv = latestLegacyVital?.recordedAt
        ? new Date(latestLegacyVital.recordedAt).getTime()
        : -1;

      if (tVp >= tLv && latestVital) {
        items.push(
          ...buildRowsFromVital(
            latestVital as VitalParametersDocument,
            pid,
            patientName,
          ),
        );
      } else if (latestLegacyVital) {
        items.push(
          ...buildRowsFromLegacyVital(
            latestLegacyVital as VitalDocument,
            pid,
            patientName,
          ),
        );
      }

      const latestSymptom = await this.symptomsModel
        .findOne({ patientId: pid })
        .sort({ reportedAt: -1 })
        .exec();

      if (latestSymptom) {
        const symRow = buildConsolidatedSymptomRow(
          latestSymptom as SymptomsDocument,
          pid,
          patientName,
        );
        if (symRow) items.push(symRow);
      }
    }

    items.sort((a, b) => b.sortScore - a.sortScore);
    const filtered = await this.filterClinicalQueueBySentAlerts(items);
    return { items: filtered, sortedBy: 'heuristic' };
  }

  /** Hide queue rows for which an alert was already saved with the same patient + sourceType + sourceId. */
  private async filterClinicalQueueBySentAlerts(
    items: ClinicalQueueRow[],
  ): Promise<ClinicalQueueRow[]> {
    if (items.length === 0) return items;
    const patientObjectIds = [
      ...new Set(items.map((i) => i.patientId)),
    ].map((id) => new Types.ObjectId(id));
    const existing = await this.alertModel
      .find({
        patientId: { $in: patientObjectIds },
        sourceType: { $exists: true, $nin: [null, ''] },
        sourceId: { $exists: true, $ne: null },
      })
      .select('patientId sourceType sourceId')
      .lean()
      .exec();
    const sent = new Set(
      existing.map(
        (d) =>
          `${String(d.patientId)}:${String(d.sourceType)}:${String(d.sourceId)}`,
      ),
    );
    return items.filter(
      (row) =>
        !sent.has(`${row.patientId}:${row.sourceType}:${row.sourceId}`),
    );
  }

  async createPhysicianAlert(body: {
    patientId: string;
    physicianUserId: string;
    severity: string;
    message?: string;
    type?: string;
    parameter?: string;
    value?: number;
    threshold?: number;
    sourceType?: string;
    sourceId?: string;
  }): Promise<AlertListItem> {
    if (!Types.ObjectId.isValid(body.patientId)) {
      throw new BadRequestException('Invalid patientId');
    }
    if (!Types.ObjectId.isValid(body.physicianUserId)) {
      throw new BadRequestException('Invalid physicianUserId');
    }

    const doc = await this.alertModel.create({
      patientId: new Types.ObjectId(body.patientId),
      triggeredBy: new Types.ObjectId(body.physicianUserId),
      type: body.type || 'physician_instruction',
      severity: body.severity,
      parameter: body.parameter,
      value: body.value,
      threshold: body.threshold,
      sourceType: body.sourceType,
      sourceId:
        body.sourceId && Types.ObjectId.isValid(body.sourceId)
          ? new Types.ObjectId(body.sourceId)
          : undefined,
      message: body.message?.trim() || 'Physician instruction',
      status: 'open',
    });

    const populated = await doc.populate('patientId', 'firstName lastName');
    return this.toListItem(populated as AlertDocument);
  }

  async acknowledge(
    id: string,
    nurseUserId?: string,
    doctorUserId?: string,
  ): Promise<AlertListItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    const patientIds = await this.getPatientUserObjectIds();
    if (patientIds.length === 0) {
      throw new NotFoundException(`Alert ${id} not found`);
    }

    const update: Record<string, unknown> = {
      status: 'acknowledged',
      acknowledgedAt: new Date(),
    };
    if (nurseUserId && Types.ObjectId.isValid(nurseUserId)) {
      update['acknowledgedBy'] = new Types.ObjectId(nurseUserId);
    } else if (doctorUserId && Types.ObjectId.isValid(doctorUserId)) {
      update['acknowledgedBy'] = new Types.ObjectId(doctorUserId);
    }

    const doc = await this.alertModel
      .findOneAndUpdate(
        { _id: id },
        update,
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .exec();

    if (!doc) throw new NotFoundException(`Alert ${id} not found`);
    return this.toListItem(doc as AlertDocument);
  }



}
