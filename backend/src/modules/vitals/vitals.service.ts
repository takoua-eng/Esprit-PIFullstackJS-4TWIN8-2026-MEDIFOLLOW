import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vital, VitalDocument } from './vital.schema';
import { User, UserDocument } from '../users/users.schema';
import { Role, RoleDocument } from '../roles/role.schema';

export type VitalListItem = {
  _id: string;
  patientId: string;
  patientName: string;
  recordedBy: string;
  recorderName: string;
  entrySource: string;
  temperature?: number;
  bloodPressure?: string;
  weight?: number;
  heartRate?: number;
  notes?: string;
  recordedAt: string;
  verifiedBy?: string;
  verifiedAt?: string | null;
  createdAt?: Date;
};

@Injectable()
export class VitalsService {
  constructor(
    @InjectModel(Vital.name) private vitalModel: Model<VitalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
  ) {}

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

  private nameOf(u: { firstName?: string; lastName?: string } | null): string {
    if (!u) return '—';
    return [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
  }

  private toListItem(doc: VitalDocument & { patientId?: unknown; recordedBy?: unknown }): VitalListItem {
    const patient = doc.patientId as unknown as {
      firstName?: string;
      lastName?: string;
    };
    const recorder = doc.recordedBy as unknown as {
      firstName?: string;
      lastName?: string;
    };
    const verifier = doc.verifiedBy as unknown as {
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
      recordedBy:
        doc.recordedBy instanceof Types.ObjectId
          ? doc.recordedBy.toString()
          : (doc.recordedBy as any)?._id?.toString() || String(doc.recordedBy),
      recorderName: this.nameOf(recorder),
      entrySource: doc.entrySource,
      temperature: doc.temperature,
      bloodPressure: doc.bloodPressure,
      weight: doc.weight,
      heartRate: doc.heartRate,
      notes: doc.notes,
      recordedAt: doc.recordedAt.toISOString(),
      verifiedBy: doc.verifiedBy?.toString(),
      verifiedAt: doc.verifiedAt ? doc.verifiedAt.toISOString() : null,
      createdAt: doc['createdAt'] as Date | undefined,
    };
  }

  async findAll(patientId?: string): Promise<VitalListItem[]> {
    const patientIds = await this.getPatientUserObjectIds();
    if (patientIds.length === 0) return [];

    const filter: Record<string, unknown> = { patientId: { $in: patientIds } };
    if (patientId && Types.ObjectId.isValid(patientId)) {
      const pid = new Types.ObjectId(patientId);
      if (patientIds.some((id) => id.equals(pid))) {
        filter['patientId'] = pid;
      }
    }

    const docs = await this.vitalModel
      .find(filter)
      .sort({ recordedAt: -1 })
      .populate('patientId', 'firstName lastName')
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .exec();

    return docs.map((d) => this.toListItem(d as VitalDocument));
  }

  async create(data: {
    patientId: string;
    recordedBy: string;
    entrySource: 'patient' | 'nurse_assisted';
    temperature?: number;
    bloodPressure?: string;
    weight?: number;
    heartRate?: number;
    notes?: string;
    recordedAt?: string;
  }): Promise<VitalListItem> {
    const patientIds = await this.getPatientUserObjectIds();
    const pid = new Types.ObjectId(data.patientId);
    if (!patientIds.some((id) => id.equals(pid))) {
      throw new NotFoundException('Patient not found or not a Patient role user');
    }

    if (!Types.ObjectId.isValid(data.recordedBy)) {
      throw new NotFoundException('Invalid recordedBy user');
    }

    const doc = await this.vitalModel.create({
      patientId: pid,
      recordedBy: new Types.ObjectId(data.recordedBy),
      entrySource: data.entrySource ?? 'nurse_assisted',
      temperature: data.temperature,
      bloodPressure: data.bloodPressure,
      weight: data.weight,
      heartRate: data.heartRate,
      notes: data.notes,
      recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
    });

    const populated = await this.vitalModel
      .findById(doc._id)
      .populate('patientId', 'firstName lastName')
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .exec();

    return this.toListItem(populated as VitalDocument);
  }

  async verify(id: string, nurseUserId: string): Promise<VitalListItem> {
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(nurseUserId)) {
      throw new NotFoundException('Invalid id');
    }

    const patientIds = await this.getPatientUserObjectIds();
    const doc = await this.vitalModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          patientId: { $in: patientIds },
          verifiedAt: { $exists: false },
        },
        {
          verifiedBy: new Types.ObjectId(nurseUserId),
          verifiedAt: new Date(),
        },
        { new: true },
      )
      .populate('patientId', 'firstName lastName')
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .exec();

    if (!doc) throw new NotFoundException(`Vital ${id} not found or already verified`);
    return this.toListItem(doc as VitalDocument);
  }
}
