import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './role.schema';
import { CreateRoleDto } from '../auth/dto/create-role.dto';
import { UpdateRoleDto } from '../auth/dto/update-role.dto';
import { ALL_PERMISSIONS } from '../../common/constants/permissions';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) {}

  // Créer un rôle
  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    // Vérifier si le rôle existe déjà
    const existingRole = await this.roleModel
      .findOne({ name: createRoleDto.name })
      .exec();
    if (existingRole) {
      throw new BadRequestException(
        `Role with name '${createRoleDto.name}' already exists`,
      );
    }

    const role = new this.roleModel(createRoleDto);
    return role.save();
  }

  // Récupérer tous les rôles
  async getAllRoles(): Promise<Role[]> {
    return this.roleModel.find().exec();
  }

  // Récupérer un rôle par ID
  async getRole(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);
    return role;
  }

  // Mettre à jour un rôle
  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    if (updateRoleDto.name) {
      const existingRole = await this.roleModel
        .findOne({ name: updateRoleDto.name })
        .exec();
      if (existingRole && existingRole._id.toString() !== id) {
        throw new BadRequestException(
          `Role with name '${updateRoleDto.name}' already exists`,
        );
      }
    }

    const role = await this.roleModel
      .findByIdAndUpdate(id, updateRoleDto, { new: true })
      .exec();
    if (!role) throw new NotFoundException(`Role with id ${id} not found`);
    return role;
  }

  // Supprimer un rôle
  async deleteRole(id: string): Promise<void> {
    const result = await this.roleModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException(`Role with id ${id} not found`);
  }

  // roles.service.ts

  async archiveRole(id: string): Promise<Role> {
    const role = await this.roleModel.findById(id).exec();

    if (!role) {
      throw new NotFoundException(`Role with id ${id} not found`);
    }

    role.isArchived = true;
    return role.save();
  }
  getAllPermissions(): Promise<string[]> {
    return Promise.resolve(ALL_PERMISSIONS);
  }
}
