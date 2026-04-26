import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/users.schema';
import { Role } from '../roles/role.schema';
import { Reminder, ReminderDocument } from './reminder.schema';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class CoordinatorSchedulerService {
  private readonly logger = new Logger(CoordinatorSchedulerService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<any>,
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
    @InjectModel('VitalParameter') private readonly vitalModel: Model<any>,
    @InjectModel('Symptom') private readonly symptomModel: Model<any>,
    private readonly notificationService: NotificationService,
  ) {}

  // ── Helpers ───────────────────────────────────────────────

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private async getNonCompliantPatients(): Promise<any[]> {
    const patientRole = await this.roleModel.findOne({ name: 'patient' }).lean();
    if (!patientRole) return [];

    const patients = await this.userModel
      .find({ role: patientRole._id, isArchived: { $ne: true } })
      .lean();

    if (patients.length === 0) return [];

    const { start, end } = this.getTodayRange();
    const patientIds = patients.map((p) => p._id as Types.ObjectId);

    const [vitalDocs, symptomDocs] = await Promise.all([
      this.vitalModel.find({ patientId: { $in: patientIds }, recordedAt: { $gte: start, $lte: end } }).lean(),
      this.symptomModel.find({ patientId: { $in: patientIds }, reportedAt: { $gte: start, $lte: end } }).lean(),
    ]);

    const vitalSet = new Set(vitalDocs.map((v: any) => v.patientId?.toString()));
    const symptomSet = new Set(symptomDocs.map((s: any) => s.patientId?.toString()));

    // Retourner les patients qui n'ont pas soumis vitals OU symptoms
    return patients.filter((p) => {
      const pid = (p._id as any).toString();
      return !vitalSet.has(pid) || !symptomSet.has(pid);
    });
  }

  // ── CRON 14h00 — Envoi email aux patients non-compliant ───

  @Cron('0 14 * * *', { name: 'daily-email-reminder', timeZone: 'Africa/Tunis' })
  async sendDailyEmailReminders(): Promise<void> {
    this.logger.log('⏰ 14h00 — Running daily email reminder job...');

    try {
      const nonCompliantPatients = await this.getNonCompliantPatients();

      if (nonCompliantPatients.length === 0) {
        this.logger.log('✅ All patients are compliant at 14h — no emails needed');
        return;
      }

      this.logger.log(`📧 Sending emails to ${nonCompliantPatients.length} non-compliant patients`);

      for (const patient of nonCompliantPatients) {
        try {
          if (!patient.email) continue;

          const patientName = `${patient.firstName} ${patient.lastName}`;
          const firstName = patient.firstName;

          const message = `Dear ${firstName}, this is your daily health reminder. You have not yet completed your vital parameters and/or symptoms report for today. Please log in to MediFollow and submit your data as soon as possible.`;

          const emailHtml = this.notificationService.buildEmailHtml(
            patientName,
            message,
            [],
            [],
          );

          await this.notificationService.sendEmail(
            patient.email,
            `MediFollow — Daily Health Reminder`,
            emailHtml,
          );

          this.logger.log(`📧 Email sent to ${patient.email} (${patientName})`);
        } catch (err) {
          this.logger.error(`Failed to send email to patient ${patient._id}: ${err.message}`);
        }
      }

      this.logger.log(`✅ Daily email job done — ${nonCompliantPatients.length} emails sent`);
    } catch (err) {
      this.logger.error(`Daily email job error: ${err.message}`);
    }
  }

  // ── CRON 18h00 — Envoi SMS aux contacts d'urgence ─────────

  @Cron('0 18 * * *', { name: 'daily-sms-reminder', timeZone: 'Africa/Tunis' })
  async sendDailySmsReminders(): Promise<void> {
    this.logger.log('⏰ 18h00 — Running daily SMS reminder job...');

    try {
      const nonCompliantPatients = await this.getNonCompliantPatients();

      if (nonCompliantPatients.length === 0) {
        this.logger.log('✅ All patients are compliant at 18h — no SMS needed');
        return;
      }

      const patientsWithEmergency = nonCompliantPatients.filter((p) => p.emergencyContact);

      this.logger.log(`📱 Sending SMS to ${patientsWithEmergency.length} emergency contacts`);

      for (const patient of patientsWithEmergency) {
        try {
          const patientName = `${patient.firstName} ${patient.lastName}`;
          const smsMessage = `MediFollow: Please submit now. Your health team is monitoring.`;

          await this.notificationService.sendSms(patient.emergencyContact, smsMessage);

          this.logger.log(`📱 SMS sent to ${patient.emergencyContact} for ${patientName}`);
        } catch (err) {
          this.logger.error(`Failed to send SMS for patient ${patient._id}: ${err.message}`);
        }
      }

      this.logger.log(`✅ Daily SMS job done — ${patientsWithEmergency.length} SMS sent`);
    } catch (err) {
      this.logger.error(`Daily SMS job error: ${err.message}`);
    }
  }
}
