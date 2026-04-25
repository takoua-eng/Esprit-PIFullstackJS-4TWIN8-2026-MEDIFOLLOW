import { Injectable, BadRequestException } from '@nestjs/common';
import { VitalParameters } from './vital-parameters.schema';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { VitalParametersDocument } from './vital-parameters.schema';
import { User, UserDocument } from '../users/users.schema';
import { AutoAlertsService } from '../auto-alerts/auto-alerts.service';
import { AutoAlertType } from '../auto-alerts/auto-alert.schema';

@Injectable()
export class VitalParametersService {


  constructor(
    @InjectModel(VitalParameters.name)
    private vitalModel: Model<VitalParametersDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly alertsService: AutoAlertsService,
  ) {}




  // âœ… CREATE VITAL PARAMETERS
    async createVital(data: Partial<VitalParameters>): Promise<VitalParameters> {

       // VÃ©rifie que patientId et reportedBy sont des ObjectId valides
        if (!data.patientId || !Types.ObjectId.isValid(data.patientId)) {
          throw new BadRequestException('patientId invalide');
        }
        if (!data.recordedBy || !Types.ObjectId.isValid(data.recordedBy)) {
          throw new BadRequestException('recordedBy invalide');
        }
      
        // VÃ©rifie que ces utilisateurs existent dans la base
        const patientExists = await this.userModel.exists({ _id: data.patientId });
        if (!patientExists) {
          throw new BadRequestException('patientId non trouvÃ© dans la base');
        }
      
        const recordedByExists = await this.userModel.exists({ _id: data.recordedBy });
        if (!recordedByExists) {
          throw new BadRequestException('recordedBy non trouvÃ© dans la base');
        }
      


      const entry = new this.vitalModel({
        ...data,
  
        // ðŸ”¥ ØªØ­ÙˆÙŠÙ„ IDs Ø¥Ù„Ù‰ ObjectId
        patientId: data.patientId
          ? new Types.ObjectId(data.patientId)
          : null,
  
        recordedBy: data.recordedBy
          ? new Types.ObjectId(data.recordedBy)
          : null,
      });
  
      const saved = await entry.save();

      // âœ… VÃ©rification des seuils et gÃ©nÃ©ration d'alertes
      await this.checkAnomalies(data);

      return saved;
    }

  // âœ… VÃ©rification des seuils
  private async checkAnomalies(data: Partial<VitalParameters>): Promise<void> {
    const patientId = data.patientId!;

    if (data.temperature !== undefined) {
      if (data.temperature > 38.5) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'temperature',
          value: data.temperature,
          message: `TempÃ©rature Ã©levÃ©e dÃ©tectÃ©e : ${data.temperature} Â°C (seuil : 38.5 Â°C)`,
        });
      } else if (data.temperature < 35) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'temperature',
          value: data.temperature,
          message: `TempÃ©rature basse dÃ©tectÃ©e : ${data.temperature} Â°C (seuil : 35 Â°C)`,
        });
      }
    }

    if (data.heartRate !== undefined) {
      if (data.heartRate > 120) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'heartRate',
          value: data.heartRate,
          message: `Rythme cardiaque Ã©levÃ© : ${data.heartRate} bpm (seuil : 120)`,
        });
      } else if (data.heartRate < 50) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'heartRate',
          value: data.heartRate,
          message: `Rythme cardiaque bas : ${data.heartRate} bpm (seuil : 50)`,
        });
      }
    }

    if (data.bloodPressuresystolic !== undefined && data.bloodPressuresystolic > 160) {
      await this.alertsService.createAlert({
        patientId,
        type: AutoAlertType.VITAL,
        parameter: 'bloodPressureSystolic',
        value: data.bloodPressuresystolic,
        message: `Tension systolique Ã©levÃ©e : ${data.bloodPressuresystolic} mmHg (seuil : 160)`,
      });
    }

    if (data.bloodPressureDiastolic !== undefined && data.bloodPressureDiastolic > 100) {
      await this.alertsService.createAlert({
        patientId,
        type: AutoAlertType.VITAL,
        parameter: 'bloodPressureDiastolic',
        value: data.bloodPressureDiastolic,
        message: `Tension diastolique Ã©levÃ©e : ${data.bloodPressureDiastolic} mmHg (seuil : 100)`,
      });
    }
    if (data.oxygenSaturation !== undefined) {
      if (data.oxygenSaturation < 90) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'oxygenSaturation',
          value: data.oxygenSaturation,
          message: `Saturation O2 critique : ${data.oxygenSaturation}% (seuil critique : < 90%)`,
        });
      }
    }

    if (data.respiratoryRate !== undefined) {
      if (data.respiratoryRate > 30) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'respiratoryRate',
          value: data.respiratoryRate,
          message: `Fréquence respiratoire élevée : ${data.respiratoryRate} resp/min (seuil : 30)`,
        });
      } else if (data.respiratoryRate < 8) {
        await this.alertsService.createAlert({
          patientId,
          type: AutoAlertType.VITAL,
          parameter: 'respiratoryRate',
          value: data.respiratoryRate,
          message: `Fréquence respiratoire basse : ${data.respiratoryRate} resp/min (seuil : 8)`,
        });
      }
    }  }





   // âœ… GET ALL VITALS (bonus ðŸ”¥)
    async getAllVitals(): Promise<VitalParameters[]> {
      return this.vitalModel
        .find()
        .populate('patientId')
        .populate('recordedBy')
        .exec();
    }

  // âœ… GET VITALS BY PATIENT
  async getByPatient(patientId: string): Promise<VitalParameters[]> {
    return this.vitalModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .sort({ recordedAt: -1 })
      .exec();
  }

  // âœ… GET LATEST VITAL ENTRY FOR A PATIENT
  async getLatest(patientId: string): Promise<VitalParameters | null> {
    return this.vitalModel
      .findOne({ patientId: new Types.ObjectId(patientId) })
      .sort({ recordedAt: -1 })
      .exec();
  }

  // âœ… CHECK IF PATIENT ENTERED VITALS TODAY
  async hasEnteredToday(patientId: string): Promise<boolean> {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const count = await this.vitalModel.countDocuments({
      patientId: new Types.ObjectId(patientId),
      recordedAt: { $gte: start, $lte: end },
    });
    return count > 0;
  }

}

