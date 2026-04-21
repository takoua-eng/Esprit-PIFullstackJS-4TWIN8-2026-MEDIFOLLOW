import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prescription, PrescriptionDocument } from './prescription.schema';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectModel(Prescription.name)
    private readonly prescriptionModel: Model<PrescriptionDocument>,
  ) {}

  async create(data: any): Promise<PrescriptionDocument> {
    const created = new this.prescriptionModel({
      ...data,
      patientId: new Types.ObjectId(data.patientId),
      doctorId: new Types.ObjectId(data.doctorId),
    });
    return created.save();
  }

  async findAll(): Promise<PrescriptionDocument[]> {
    return this.prescriptionModel
      .find()
      .populate('patientId', 'firstName lastName')
      .populate('doctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByPatient(patientId: string): Promise<PrescriptionDocument[]> {
    return this.prescriptionModel
      .find({ patientId: new Types.ObjectId(patientId) })
      .populate('doctorId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByDoctor(doctorId: string): Promise<PrescriptionDocument[]> {
    return this.prescriptionModel
      .find({ doctorId: new Types.ObjectId(doctorId) })
      .populate('patientId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<PrescriptionDocument> {
    const p = await this.prescriptionModel.findById(id).exec();
    if (!p) throw new NotFoundException('Prescription not found');
    return p;
  }

  async remove(id: string): Promise<any> {
    return this.prescriptionModel.findByIdAndDelete(id).exec();
  }
}
