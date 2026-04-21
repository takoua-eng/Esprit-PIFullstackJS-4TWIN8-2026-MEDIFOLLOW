import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Symptoms } from './symptoms.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SymptomsDocument } from './symptoms.schema';
import { User, UserDocument } from '../users/users.schema';
import { AutoAlertsService } from '../auto-alerts/auto-alerts.service';
import { AutoAlertType } from '../auto-alerts/auto-alert.schema';

export type SymptomListItem = {
  _id: string;
  patientId: string;
  patientName: string;
  reportedBy: string;
  reporterName: string;
  entrySource: string;
  symptoms: string[];
  painLevel?: number;
  description?: string;
  reportedAt: string;
  verifiedBy?: string;
  verifiedAt?: string | null;
  createdAt?: Date;
};

@Injectable()
export class SymptomsService {
  constructor(
    @InjectModel(Symptoms.name) private symptomsModel: Model<SymptomsDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly alertsService: AutoAlertsService,
  ) {}

  private nameOf(u: { firstName?: string; lastName?: string } | null): string {
    if (!u) return '—';
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
  }

  private toListItem(
    doc: SymptomsDocument & { patientId?: unknown; reportedBy?: unknown },
  ): SymptomListItem {
    const patient = doc.patientId as unknown as {
      firstName?: string;
      lastName?: string;
    };
    const reporter = doc.reportedBy as unknown as {
      firstName?: string;
      lastName?: string;
    };

    return {
      _id: doc._id.toString(),
      patientId:
        doc.patientId instanceof Types.ObjectId
          ? doc.patientId.toString()
          : (doc.patientId as any)?._id?.toString() || String(doc.patientId),
      patientName: this.nameOf(patient),
      reportedBy:
        doc.reportedBy instanceof Types.ObjectId
          ? doc.reportedBy.toString()
          : (doc.reportedBy as any)?._id?.toString() || String(doc.reportedBy),
      reporterName: this.nameOf(reporter),
      entrySource: doc.entrySource ?? 'patient',
      symptoms: doc.symptoms || [],
      painLevel: doc.painLevel,
      description: doc.description,
      reportedAt:
        doc.reportedAt instanceof Date
          ? doc.reportedAt.toISOString()
          : String(doc.reportedAt),
      verifiedBy: doc.verifiedBy?.toString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      createdAt: doc['createdAt'] as Date | undefined,
    };
  }

  async findAllForStaff(patientId?: string): Promise<SymptomListItem[]> {
    const filter: Record<string, unknown> = {};
    if (patientId && Types.ObjectId.isValid(patientId)) {
      filter['patientId'] = new Types.ObjectId(patientId);
    }

    const docs = await this.symptomsModel
      .find(filter)
      .sort({ reportedAt: -1 })
      .populate('patientId', 'firstName lastName')
      .populate('reportedBy', 'firstName lastName')
      .exec();

    return docs.map((d) => this.toListItem(d as SymptomsDocument));
  }

  async createSymptoms(data: Partial<Symptoms> & Record<string, unknown>): Promise<Symptoms> {
    if (!data.patientId || !Types.ObjectId.isValid(String(data.patientId))) {
      throw new BadRequestException('patientId invalide');
    }
    if (!data.reportedBy || !Types.ObjectId.isValid(String(data.reportedBy))) {
      throw new BadRequestException('reportedBy invalide');
    }

    const patientExists = await this.userModel.exists({
      _id: data.patientId,
    });
    if (!patientExists) {
      throw new BadRequestException('patientId non trouve dans la base');
    }

    const reportedByExists = await this.userModel.exists({
      _id: data.reportedBy,
    });
    if (!reportedByExists) {
      throw new BadRequestException('reportedBy non trouve dans la base');
    }

    const symptomsArr = Array.isArray(data.symptoms) ? data.symptoms : [];
    const painLevel =
      typeof data.painLevel === 'number' ? data.painLevel : Number(data.painLevel ?? 0);
    const fatigueLevel =
      typeof data.fatigueLevel === 'number'
        ? data.fatigueLevel
        : Number(data.fatigueLevel ?? 0);
    const shortnessOfBreath =
      typeof data.shortnessOfBreath === 'boolean'
        ? data.shortnessOfBreath
        : Boolean(data.shortnessOfBreath);
    const nausea =
      typeof data.nausea === 'boolean' ? data.nausea : Boolean(data.nausea);

    const entry = new this.symptomsModel({
      ...data,
      patientId: new Types.ObjectId(String(data.patientId)),
      reportedBy: new Types.ObjectId(String(data.reportedBy)),
      symptoms: symptomsArr,
      painLevel,
      fatigueLevel,
      shortnessOfBreath,
      nausea,
      entrySource: data.entrySource ?? 'patient',
      reportedAt: data.reportedAt ? new Date(data.reportedAt as Date) : new Date(),
    });

    const saved = await entry.save();

    await this.checkSymptomAlerts({
      ...data,
      patientId: data.patientId,
      painLevel,
      fatigueLevel,
      shortnessOfBreath,
    });

    return saved;
  }

  private async checkSymptomAlerts(data: Partial<Symptoms>): Promise<void> {
    const patientId = data.patientId!;

    if (data.painLevel !== undefined && data.painLevel >= 8) {
      await this.alertsService.createAlert({
        patientId,
        type: AutoAlertType.SYMPTOM,
        parameter: 'painLevel',
        value: data.painLevel,
        message: `Douleur intense signalee : ${data.painLevel}/10`,
      });
    }

    if (data.fatigueLevel !== undefined && data.fatigueLevel >= 8) {
      await this.alertsService.createAlert({
        patientId,
        type: AutoAlertType.SYMPTOM,
        parameter: 'fatigueLevel',
        value: data.fatigueLevel,
        message: `Fatigue intense signalee : ${data.fatigueLevel}/10`,
      });
    }

    if (data.shortnessOfBreath === true) {
      await this.alertsService.createAlert({
        patientId,
        type: AutoAlertType.SYMPTOM,
        parameter: 'shortnessOfBreath',
        message: `Essoufflement signale par le patient`,
      });
    }
  }

  async getAllSymptoms(): Promise<Symptoms[]> {
    return this.symptomsModel
      .find()
      .populate('patientId')
      .populate('reportedBy')
      .exec();
  }

  async getByPatient(patientId: string): Promise<Symptoms[]> {
    return this.symptomsModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .sort({ reportedAt: -1 })
      .exec();
  }

  async hasEnteredToday(patientId: string): Promise<boolean> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const count = await this.symptomsModel.countDocuments({
      patientId: new Types.ObjectId(patientId),
      reportedAt: { $gte: start, $lte: end },
    });
    return count > 0;
  }

  async verify(id: string, nurseUserId: string): Promise<SymptomListItem> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(nurseUserId)) {
      throw new NotFoundException('Invalid id');
    }

    const doc = await this.symptomsModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          verifiedAt: { $exists: false },
        },
        {
          verifiedBy: new Types.ObjectId(nurseUserId),
          verifiedAt: new Date(),
        },
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .populate('reportedBy', 'firstName lastName')
      .exec();

    if (!doc) {
      throw new NotFoundException(
        `Symptom entry ${id} not found or already verified`,
      );
    }
    return this.toListItem(doc as SymptomsDocument);
  }
}
