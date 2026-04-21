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
    permissions: [
      'users:read', 'users:create', 'users:update', 'users:delete', 'users:manage',
      'patients:read', 'patients:create', 'patients:update', 'patients:delete', 'patients:*',
      'doctors:read', 'doctors:create', 'doctors:update', 'doctors:delete', 'doctors:*',
      'nurses:read', 'nurses:create', 'nurses:update', 'nurses:delete', 'nurses:*', 'nurses:manage',
      'coordinators:read', 'coordinators:create', 'coordinators:update', 'coordinators:delete', 'coordinators:*',
      'auditors:read', 'auditors:create', 'auditors:update', 'auditors:delete', 'auditors:*',
      'physicians:read',
      'services:manage', 'services:read',
      'alerts:read', 'alerts:validate', 'alerts:manage',
      'vitals:read', 'vitals:create',
      'questionnaires:manage', 'questionnaires:read',
      'reminders:send',
      'dashboard:read', 'dashboard:view',
      'reports:generate', 'reports:export',
      'profile:read', 'profile:update',
      'notifications:read',
    ],
  },
  {
    name: 'doctor',
    displayName: 'Physician',
    permissions: [
      'patients:read', 'patients:update',
      'alerts:read', 'alerts:validate',
      'vitals:read', 'vitals:create',
      'questionnaires:read',
      'dashboard:read', 'dashboard:view',
      'profile:read', 'profile:update',
      'notifications:read',
    ],
  },
  {
    name: 'nurse',
    displayName: 'Nurse',
    permissions: [
      'patients:read', 'patients:update',
      'nurses:manage',
      'alerts:read',
      'vitals:read', 'vitals:create',
      'dashboard:read', 'dashboard:view',
      'profile:read', 'profile:update',
      'notifications:read',
    ],
  },
  {
    name: 'coordinator',
    displayName: 'Coordinator',
    permissions: [
      'patients:read',
      'alerts:read',
      'questionnaires:read',
      'reminders:send',
      'dashboard:read', 'dashboard:view',
      'profile:read', 'profile:update',
      'notifications:read',
    ],
  },
  {
    name: 'auditor',
    displayName: 'Auditor',
    permissions: [
      'audit:read', 'audit:export',
      'logs:read',
      'users:read',
      'patients:read',
      'doctors:read',
      'nurses:read',
      'coordinators:read',
      'auditors:read',
      'physicians:read',
      'reminders:send',
      'dashboard:read', 'dashboard:view',
      'profile:read', 'profile:update',
      'notifications:read',
      'reports:generate',
    ],
  },
  {
    name: 'patient',
    displayName: 'Patient',
    permissions: [
      'profile:read', 'profile:update',
      'vitals:create', 'vitals:read',
      'questionnaires:submit', 'questionnaires:read',
      'notifications:read',
      'users:read',   // pour GET /users/:id (son propre profil)
    ],
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
      await roleModel.updateOne(
        { _id: exists._id },
        { $set: { permissions: roleData.permissions } },
      );
      console.log(`🔄 Permissions mises à jour: ${roleData.displayName}`);
    }
  }
}
