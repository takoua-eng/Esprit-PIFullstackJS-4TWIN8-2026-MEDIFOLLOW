import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Reminder, ReminderDocument } from './reminder.schema';
import { User, UserDocument } from '../users/users.schema';
import { Role, RoleDocument } from '../roles/role.schema';
import { Symptoms, SymptomsDocument } from '../symptoms/symptoms.schema';
import { VitalParameters, VitalParametersDocument } from '../vital-parameters/vital-parameters.schema';

export type ReminderListItem = {
  _id: string;
  patientId: string;
  patientName: string;
  type: string;
  message: string;
  status: string;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt?: Date;
};

export type ComplianceSummary = {
  patientId: string;
  patientName: string;
  lastEntry: string | null;
  status: 'compliant' | 'non-compliant' | 'overdue';
  lastReminder?: {
    type: string;
    message: string;
    status: string;
    sentAt: string | null;
  };
};

export type DailyCompliance = {
  date: string;
  status: 'done' | 'not-done';
  entries: { type: string; time: string }[];
};

@Injectable()
export class RemindersService implements OnModuleInit {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name) private reminderModel: Model<ReminderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Symptoms.name) private symptomsModel: Model<SymptomsDocument>,
    @InjectModel(VitalParameters.name) private vitalParametersModel: Model<VitalParametersDocument>,
  ) { }

  /** ObjectIds of users whose role is Patient — alerts/reminders apply only to them. */
  private async getPatientUserObjectIds(): Promise<Types.ObjectId[]> {
    const patientRole = await this.roleModel.findOne({ name: 'Patient' }).exec();
    if (!patientRole) return [];
    const users = await this.userModel
      .find({ role: patientRole._id })
      .select('_id')
      .lean()
      .exec();
    return users.map((u) => u._id as Types.ObjectId);
  }

  async onModuleInit() {
    const count = await this.reminderModel.countDocuments().exec();
    if (count > 0) return;

    const patientRole = await this.roleModel.findOne({ name: 'Patient' }).exec();
    if (!patientRole) {
      this.logger.warn(
        'Demo reminders not seeded: no Role named "Patient" in the database.',
      );
      return;
    }

    const patientUser = await this.userModel
      .findOne({ role: patientRole._id })
      .exec();
    if (!patientUser) {
      this.logger.warn(
        'Demo reminders not seeded: no user with role Patient. Create a patient user first.',
      );
      return;
    }

    const nurseRole = await this.roleModel.findOne({ name: 'Nurse' }).exec();
    const nurseUser = nurseRole
      ? await this.userModel.findOne({ role: nurseRole._id }).exec()
      : null;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await this.reminderModel.insertMany([
      {
        patientId: patientUser._id,
        sentBy: nurseUser?._id,
        type: 'questionnaire',
        message: 'Complete post-discharge questionnaire (due today)',
        status: 'pending',
        scheduledAt: now,
      },
      {
        patientId: patientUser._id,
        sentBy: nurseUser?._id,
        type: 'vitals',
        message: 'Reminder: log morning vitals (BP, HR)',
        status: 'pending',
        scheduledAt: tomorrow,
      },
      {
        patientId: patientUser._id,
        type: 'follow_up',
        message: 'Phone follow-up — initial call completed',
        status: 'completed',
        scheduledAt: new Date(now.getTime() - 86400000),
        sentAt: new Date(now.getTime() - 3600000),
      },
    ]);

    this.logger.log(
      `Seeded demo reminders for patient ${patientUser.firstName} ${patientUser.lastName}`,
    );
  }

  private toListItem(
    doc: ReminderDocument & { patientId?: unknown },
  ): ReminderListItem {
    const p = doc.patientId as unknown as {
      firstName?: string;
      lastName?: string;
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
          : String(doc.patientId),
      patientName,
      type: doc.type,
      message: doc.message,
      status: doc.status,
      scheduledAt: doc.scheduledAt
        ? doc.scheduledAt.toISOString()
        : null,
      sentAt: doc.sentAt ? doc.sentAt.toISOString() : null,
      createdAt: doc['createdAt'] as Date | undefined,
    };
  }

  async findAll(): Promise<ReminderListItem[]> {
    const patientIds = await this.getPatientUserObjectIds();
    if (patientIds.length === 0) return [];

    const docs = await this.reminderModel
      .find({ patientId: { $in: patientIds } })
      .sort({ scheduledAt: 1, createdAt: -1 })
      .populate('patientId', 'firstName lastName')
      .exec();
    return docs.map((d) => this.toListItem(d as ReminderDocument));
  }

  async findByPatient(patientId: string): Promise<ReminderListItem[]> {
    if (!Types.ObjectId.isValid(patientId)) return [];
    const docs = await this.reminderModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .sort({ createdAt: -1 })
      .populate('patientId', 'firstName lastName')
      .exec();
    return docs.map((d) => this.toListItem(d as ReminderDocument));
  }

  async groupByPatient(): Promise<{ patientId: string; patientName: string; total: number; pending: number; sent: number; lastStatus: string }[]> {
    const all = await this.findAll();
    const map = new Map<string, typeof all>();

    for (const r of all) {
      const key = r.patientId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }

    return Array.from(map.entries()).map(([patientId, rems]) => ({
      patientId,
      patientName: rems[0].patientName,
      total: rems.length,
      pending: rems.filter(r => r.status === 'pending' || r.status === 'scheduled').length,
      sent: rems.filter(r => r.status === 'sent').length,
      lastStatus: rems[0].status,
    }));
  }

  async findPendingCount(): Promise<number> {
    const patientIds = await this.getPatientUserObjectIds();
    if (patientIds.length === 0) return 0;

    return this.reminderModel
      .countDocuments({
        status: 'pending',
        patientId: { $in: patientIds },
      })
      .exec();
  }

  /**
   * Auto-mark sent reminders as 'answered' when a patient submits vitals or symptoms.
   * Call this from vitals.service and symptoms.service after a successful create.
   */
  async markAnsweredForPatient(patientId: string): Promise<void> {
    if (!Types.ObjectId.isValid(patientId)) return;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    await this.reminderModel.updateMany(
      {
        patientId: new Types.ObjectId(patientId),
        status: 'sent',
        createdAt: { $gte: todayStart, $lte: todayEnd },
      },
      { $set: { status: 'answered' } },
    ).exec();
  }

  async complete(id: string): Promise<ReminderListItem> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(`Reminder ${id} not found`);
    }

    const patientIds = await this.getPatientUserObjectIds();
    if (patientIds.length === 0) {
      throw new NotFoundException(`Reminder ${id} not found`);
    }

    const doc = await this.reminderModel
      .findOneAndUpdate(
        {
          _id: id,
          patientId: { $in: patientIds },
        },
        {
          status: 'completed',
          sentAt: new Date(),
        },
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .exec();

    if (!doc) throw new NotFoundException(`Reminder ${id} not found`);
    return this.toListItem(doc as ReminderDocument);
  }

  async getComplianceSummary(): Promise<ComplianceSummary[]> {
    const patientIds = await this.getPatientUserObjectIds();
    if (patientIds.length === 0) return [];

    const patients = await this.userModel
      .find({ _id: { $in: patientIds } })
      .select('firstName lastName')
      .lean()
      .exec();

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const summaries: ComplianceSummary[] = [];

    for (const p of patients) {
      const [lastVital, lastSymptom, lastReminder] = await Promise.all([
        this.vitalParametersModel.findOne({ patientId: p._id }).sort({ recordedAt: -1 }).exec(),
        this.symptomsModel.findOne({ patientId: p._id }).sort({ reportedAt: -1 }).exec(),
        this.reminderModel.findOne({ patientId: p._id }).sort({ createdAt: -1 }).exec(),
      ]);

      const lastEntryDate = [
        lastVital?.recordedAt,
        lastSymptom?.reportedAt
      ].filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];

      let status: ComplianceSummary['status'] = 'overdue';
      if (lastEntryDate) {
        if (lastEntryDate >= twentyFourHoursAgo) {
          status = 'compliant';
        } else if (lastEntryDate >= sevenDaysAgo) {
          status = 'non-compliant';
        }
      }

      summaries.push({
        patientId: String(p._id),
        patientName: `${p.firstName} ${p.lastName ?? ''}`.trim(),
        lastEntry: lastEntryDate ? lastEntryDate.toISOString() : null,
        status,
        lastReminder: lastReminder ? {
          type: lastReminder.type,
          message: lastReminder.message,
          status: lastReminder.status,
          sentAt: lastReminder.sentAt ? lastReminder.sentAt.toISOString() : null,
        } : undefined,
      });
    }

    return summaries;
  }

  async getPatientComplianceHistory(patientId: string, days: number = 7): Promise<DailyCompliance[]> {
    if (!Types.ObjectId.isValid(patientId)) return [];

    const history: DailyCompliance[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const [vitals, symptoms] = await Promise.all([
        this.vitalParametersModel.find({
          patientId,
          recordedAt: { $gte: date, $lt: nextDay }
        }).lean().exec(),
        this.symptomsModel.find({
          patientId,
          reportedAt: { $gte: date, $lt: nextDay }
        }).lean().exec()
      ]);

      const entries: DailyCompliance['entries'] = [
        ...vitals.map(v => ({ type: 'Vital Parameters', time: v.recordedAt.toISOString() })),
        ...symptoms.map(s => ({ type: 'Symptoms', time: s.reportedAt.toISOString() }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

      history.push({
        date: date.toISOString().split('T')[0],
        status: entries.length > 0 ? 'done' : 'not-done',
        entries
      });
    }

    return history;
  }
}
