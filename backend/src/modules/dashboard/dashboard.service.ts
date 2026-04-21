import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/users.schema';
import { Role, RoleDocument } from '../roles/role.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
  ) {}

  async getStats() {
    const roles = await this.roleModel.find({ name: { $in: ['patient', 'doctor', 'nurse', 'coordinator'] } }).exec();
    const roleMap: Record<string, any> = {};
    roles.forEach(r => roleMap[r.name] = r._id);

    const activeQuery = { $or: [{ isArchived: false }, { isArchived: { $exists: false } }] };

    const [patients, doctors, nurses, coordinators] = await Promise.all([
      roleMap['patient'] ? this.userModel.countDocuments({ role: roleMap['patient'], ...activeQuery }) : 0,
      roleMap['doctor'] ? this.userModel.countDocuments({ role: roleMap['doctor'], ...activeQuery }) : 0,
      roleMap['nurse'] ? this.userModel.countDocuments({ role: roleMap['nurse'], ...activeQuery }) : 0,
      roleMap['coordinator'] ? this.userModel.countDocuments({ role: roleMap['coordinator'], ...activeQuery }) : 0,
    ]);

    return {
      patients,
      doctors,
      nurses,
      coordinators
    };
  }
}
