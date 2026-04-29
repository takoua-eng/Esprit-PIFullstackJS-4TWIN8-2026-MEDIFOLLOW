import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AutoAlert, AutoAlertDocument, AutoAlertStatus, AutoAlertType } from './auto-alert.schema';

@Injectable()
export class AutoAlertsService {
  constructor(
    @InjectModel(AutoAlert.name) private autoAlertModel: Model<AutoAlertDocument>,
  ) {}

  async createAlert(data: {
    patientId: Types.ObjectId | string;
    type: AutoAlertType;
    parameter: string;
    value?: number;
    message: string;
  }): Promise<AutoAlert> {
    const alert = new this.autoAlertModel({
      ...data,
      patientId: new Types.ObjectId(data.patientId),
      status: AutoAlertStatus.PENDING,
    });
    return alert.save();
  }

  async getByPatient(patientId: string): Promise<AutoAlert[]> {
    return this.autoAlertModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async countPending(patientId: string): Promise<number> {
    // Count only today's pending alerts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    return this.autoAlertModel.countDocuments({
      patientId: new Types.ObjectId(patientId),
      status: AutoAlertStatus.PENDING,
      createdAt: { $gte: todayStart },
    });
  }

  async markResolved(alertId: string): Promise<AutoAlert | null> {
    return this.autoAlertModel.findByIdAndUpdate(
      alertId,
      { status: AutoAlertStatus.RESOLVED },
      { new: true },
    );
  }

  async getRecentByPatient(patientId: string, limit = 5): Promise<AutoAlert[]> {
    return this.autoAlertModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }
}
