// src/common/seed/seed-roles.ts
import { Model } from 'mongoose';
import { Role } from '../../modules/roles/role.schema';

export const DEFAULT_ROLES = [
  {
    name: 'superadmin',
    displayName: 'Super Admin',
    permissions: ['*'],
  },
  {
    name: 'admin',
    displayName: 'Administrator',

    permissions: ['*'],
  },
  {
    name: 'doctor',
    displayName: 'Physician',
    permissions: ['*'],
  },
  {
    name: 'nurse',
    displayName: 'Nurse',
    permissions: ['*'],
  },
  {
    name: 'coordinator',
    displayName: 'Coordinator',
    permissions: ['*'],
  },
  {
    name: 'auditor',
    displayName: 'Auditor',
    permissions: ['*'],
  },
  {
    name: 'patient',
    displayName: 'Patient',
    permissions: ['*'],
  },
];

export async function seedRoles(roleModel: Model<Role>) {
  for (const roleData of DEFAULT_ROLES) {
    const exists = await roleModel.findOne({ name: roleData.name }).exec();
    if (!exists) {
      await roleModel.create(roleData);
      console.log(`✅ Rôle créé: ${roleData.displayName}`);
    } else {
      // Toujours mettre à jour les permissions pour rester en sync
      /* await roleModel.updateOne(
         { _id: exists._id },
         { $set: { permissions: roleData.permissions } },
       );*/
      console.log(`Role : ${roleData.displayName}`);
    }
  }
}

