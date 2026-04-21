import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// DTOs
import { CreatePatientDto } from './dto/CreatePatientDto ';
import { CreateDoctorDto } from './dto/CreateDoctorDto ';
import { CreateAdminDto } from './dto/CreateAdminDto ';
import { CreateNurseDto } from './dto/CreateNurseDto ';
import { CreateCoordinatorDto } from './dto/CreateCoordinatorDto ';
import { CreateAuditorDto } from './dto/CreateAuditorDto ';
import { NurseDossierDto } from './dto/nurse-dossier.dto';

// Guards & Decorators
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

// Multer Config
const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
};

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =========================
  // 🔴 CREATE (Patients, Doctors, etc.)
  // =========================

  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Post('patients')
  @Permissions('patients:create')
  createPatient(
    @Body() dto: CreatePatientDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    console.log('📥 CREATE PATIENT - body:', JSON.stringify(dto, null, 2));
    console.log('📎 file:', file?.filename ?? 'none');
    return this.usersService.createPatient(dto, file);
  }

  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Post('doctors')
  @Permissions('doctors:create')
  createDoctor(
    @Body() dto: CreateDoctorDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.createDoctor(dto, file);
  }

  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Post('nurses')
  @Permissions('nurses:create')
  createNurse(
    @Body() dto: CreateNurseDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.createNurse(dto, file);
  }

  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Post('coordinators')
  @Permissions('coordinators:create')
  createCoordinator(
    @Body() dto: CreateCoordinatorDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.createCoordinator(dto, file);
  }

  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Post('admins')
  @Permissions('users:create')
  createAdmin(
    @Body() dto: CreateAdminDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.createAdmin(dto, file);
  }

  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Post('auditors')
  @Permissions('auditors:create')
  createAuditor(
    @Body() dto: CreateAuditorDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.createAuditor(dto, file);
  }

  // =========================
  // ✅ GET - Avec conditions PATIENT
  // =========================

  @Get('patients')
  @Permissions('patients:read') // ✅ Patient ne peut PAS voir la liste
  getPatients() {
    return this.usersService.getPatients();
  }

  @Get('doctors')
  @Permissions('doctors:read')
  getDoctors() {
    return this.usersService.getDoctors();
  }

  @Get('nurses')
  @Permissions('nurses:read')
  getNurses() {
    return this.usersService.getNurses();
  }

  @Get('coordinators')
  @Permissions('coordinators:read')
  getCoordinators() {
    return this.usersService.getCoordinators();
  }

  @Get('admins')
  @Permissions('users:read') // ✅ Réservé aux admins
  getAdmins() {
    return this.usersService.getAdmins();
  }

  @Get('auditors')
  @Permissions('audit:read')
  getAuditors() {
    return this.usersService.getAuditors();
  }

  @Get('role/:roleName')
  @Permissions('users:read')
  getByRole(@Param('roleName') roleName: string) {
    return this.usersService.getByRole(roleName);
  }

  @Get()
  @Permissions('users:read')
  findAll() {
    return this.usersService.getAllUsers();
  }

  @Get('physicians')
  @Permissions('doctors:read')
  findPhysicians() {
    return this.usersService.findByRoleName('Physician');
  }
  //get profile
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {
    const userId = req.user._id;
    return this.usersService.getUser(userId);
  }
  // ✅ GET UN USER : Condition spéciale pour patient
  @Get(':id')
  @Permissions('users:read', 'profile:read') // L'un OU l'autre suffit
  findOne(@Param('id') id: string, @Request() req) {
    const user = req.user; // ← vient du JWT

    // 🎯 CONDITION PATIENT : Peut voir SON propre profil uniquement
    if (user.role === 'patient' && user.permissions.includes('profile:read')) {
      if (user._id !== id) {
        throw new ForbiddenException(
          'Accès refusé: vous ne pouvez voir que votre propre profil',
        );
      }
    }

    // Sinon, il faut avoir "users:read" (admin, doctor, etc.)
    if (!user.permissions.includes('users:read') && user.role === 'patient') {
      throw new ForbiddenException('Accès refusé');
    }

    return this.usersService.getUser(id);
  }

  // ✅ GET NURSE DOSSIER : Condition spéciale
  @Get(':patientId/nurse-dossier')
  @Permissions('patients:read', 'profile:read')
  getNurseDossier(@Param('patientId') patientId: string, @Request() req) {
    const user = req.user;

    // Patient ne peut voir que SON dossier
    if (user.role === 'patient' && user.permissions.includes('profile:read')) {
      if (user._id !== patientId) {
        throw new ForbiddenException('Accès refusé: dossier non autorisé');
      }
    }

    return this.usersService.getNurseDossier(patientId);
  }

  // =========================
  // ✅ UPDATE - Avec conditions PATIENT
  // =========================

  @Put(':patientId/nurse-dossier')
  @Permissions('patients:update', 'nurses:manage')
  updateNurseDossier(
    @Param('patientId') patientId: string,
    @Body() dto: NurseDossierDto,
  ) {
    return this.usersService.updateNurseDossier(patientId, dto);
  }

  // users.controller.ts
  @Get('doctors/:id')
  getDoctorById(@Param('id') id: string) {
    return this.usersService.getDoctor(id); // méthode spécifique à créer dans UsersService
  }

  @Get('nurses/:id')
  getNurseById(@Param('id') id: string) {
    return this.usersService.getNurse(id);
  }

  // Ajouter après @Get('doctors/:id')

  @Get('patients/:id')
  getPatientById(@Param('id') id: string) {
    return this.usersService.getPatient(id);
  }

  @Put('patients/:id/archive')
  archivePatient(@Param('id') id: string) {
    return this.usersService.archivePatient(id);
  }

  @Put('patients/:id/activate')
  activatePatient(@Param('id') id: string) {
    return this.usersService.activatePatient(id);
  }

  @Put('patients/:id/deactivate')
  deactivatePatient(@Param('id') id: string) {
    return this.usersService.deactivatePatient(id);
  }

  // ✅ OK ordre correct

  @Get('coordinators/:id')
  getCoordinatorById(@Param('id') id: string) {
    return this.usersService.getCoordinator(id);
  }

  @Get('auditors/:id')
getAuditorById(@Param('id') id: string) {
  return this.usersService.getAuditor(id);
}





// --- Archive auditor ---
@Put('auditors/:id/archive')
archiveAuditor(@Param('id') id: string) {
  return this.usersService.archiveAuditor(id);
}

// --- Activate auditor ---
@Put('auditors/:id/activate')
activateAuditor(@Param('id') id: string) {
  return this.usersService.activateAuditor(id);
}

// --- Deactivate auditor ---
@Put('auditors/:id/deactivate')
deactivateAuditor(@Param('id') id: string) {
  return this.usersService.deactivateAuditor(id);
}

// --- Update auditor (with optional file upload) ---
@UseInterceptors(FileInterceptor('file', multerConfig))
@Put('auditors/:id')
updateAuditor(
  @Param('id') id: string,
  @Body() dto: any,
  @UploadedFile() file?: Express.Multer.File
) {
  return this.usersService.updateAuditor(id, dto, file);
}


  // ⚠️ TOUJOURS À LA FIN


  //edit patient with optional photo
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Put('patients/:id')
  updatePatient(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.usersService.updatePatient(id, dto, file);
  }


  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Put('doctors/:id')
  updateDoctor(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateDoctor(id, dto, file);
  }

  // Update Coordinator with optional photo
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Put('coordinators/:id')
  updateCoordinator(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.updateCoordinator(id, dto, file);
  }

  // Update Nurse with optional photo
  // Update Nurse with optional photo
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Put('nurses/:id')
  updateNurse(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return this.usersService.updateNurse(id, dto, file);
  }

  // Archiving endpoints
  @Put('coordinators/:id/archive')
  archiveCoordinator(@Param('id') id: string) {
    return this.usersService.archiveCoordinator(id);
  }
  // Activate / Deactivate
  @Put('coordinators/:id/activate')
  activateCoordinator(@Param('id') id: string) {
    return this.usersService.activateCoordinator(id);
  }

  // Archiver nurse
  @Put('nurses/:id/archive')
  archiveNurse(@Param('id') id: string) {
    return this.usersService.archiveNurse(id);
  }

  // Activer nurse
  @Put('nurses/:id/activate')
  activateNurse(@Param('id') id: string) {
    return this.usersService.activateNurse(id);
  }

  // Désactiver nurse
  @Put('nurses/:id/deactivate')
  deactivateNurse(@Param('id') id: string) {
    return this.usersService.deactivateNurse(id);
  }

  @Put('coordinators/:id/deactivate')
  deactivateCoordinator(@Param('id') id: string) {
    return this.usersService.deactivateCoordinator(id);
  }

  @Put('doctors/:id/archive')
  archiveDoctor(@Param('id') id: string) {
    return this.usersService.archiveDoctor(id);
  }
  /*@Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateUser(id, dto);
  }*/
  // ✅ UPDATE USER
  /*@UseInterceptors(FileInterceptor('file', multerConfig))
  @Put(':id')
  @Permissions(
    'users:update',
    'profile:update',
    'patients:update',
    'nurses:update',
    'doctors:update',
    'coordinators:update',
    'auditors:update',
  )
  update(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const user = req.user;
    const perms: string[] = user?.permissions ?? [];
    const isSuperAdmin = perms.includes('*');

    // Patient : peut modifier uniquement son propre profil, champs limités
    if (user.role === 'patient' && perms.includes('profile:update')) {
      if (user._id !== id) {
        throw new ForbiddenException(
          'Accès refusé: vous ne pouvez modifier que votre propre profil',
        );
      }
      const allowedFields = [
        'firstName',
        'lastName',
        'phone',
        'address',
        'photo',
      ];
      const filteredDto = Object.keys(dto)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj: any, key) => {
          obj[key] = dto[key];
          return obj;
        }, {});
      return this.usersService.updateUserWithFile(id, filteredDto, file);
    }

    // SuperAdmin (*) ou admin avec users:update ou rôle-specific update → autorisé
    const canUpdate =
      isSuperAdmin ||
      perms.includes('users:update') ||
      perms.includes('patients:update') ||
      perms.includes('nurses:update') ||
      perms.includes('doctors:update') ||
      perms.includes('coordinators:update') ||
      perms.includes('auditors:update');

    if (!canUpdate) {
      throw new ForbiddenException(
        'Permission insuffisante pour modifier cet utilisateur',
      );
    }

    return this.usersService.updateUserWithFile(id, dto, file);
  }*/

  // =========================
  // ✅ UPDATE USER (general — all roles)
  // =========================
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @Put(':id')
  @Permissions('users:update', 'profile:update', 'patients:update', 'nurses:update', 'doctors:update', 'coordinators:update', 'auditors:update')
  updateUsers(
    @Param('id') id: string,
    @Body() dto: any,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    const user = req.user;
    const perms: string[] = user?.permissions ?? [];
    const isSuperAdmin = perms.includes('*');

    // Patient: can only update own profile, limited fields
    if (user.role === 'patient' && perms.includes('profile:update')) {
      if (user._id !== id) {
        throw new ForbiddenException('Access denied: you can only edit your own profile');
      }
      const allowed = ['firstName', 'lastName', 'phone', 'address', 'photo'];
      const filtered = Object.keys(dto)
        .filter(k => allowed.includes(k))
        .reduce((o: any, k) => { o[k] = dto[k]; return o; }, {});
      return this.usersService.updateUsers(id, filtered, file);
    }

    const canUpdate = isSuperAdmin
      || perms.includes('users:update')
      || perms.includes('patients:update')
      || perms.includes('nurses:update')
      || perms.includes('doctors:update')
      || perms.includes('coordinators:update')
      || perms.includes('auditors:update');

    if (!canUpdate) throw new ForbiddenException('Insufficient permission');

    return this.usersService.updateUsers(id, dto, file);
  }

  // =========================
  // ❌ DELETE - Jamais pour patient
  // =========================

  @Delete(':id')
  @Permissions('users:delete', 'patients:delete') // Patient n'a JAMAIS ces permissions
  remove(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  // =========================
  // ✅ ACTIVATE/DEACTIVATE/RESTORE - Admin only
  // =========================

  @Put(':id/restore')
  @Permissions('users:manage')
  restore(@Param('id') id: string) {
    return this.usersService.restoreUser(id);
  }

  @Put(':id/activate')
  @Permissions('users:manage')
  activate(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }

  @Put(':id/deactivate')
  @Permissions('users:manage')
  deactivate(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  //verification de l'email
  @Get('check-email/:email')
  checkEmail(@Param('email') email: string) {
    return this.usersService.emailExists(email); // à créer dans UsersService
  }

  // Check email for Coordinator
  @Get('coordinators/check-email/:email')
  checkCoordinatorEmail(@Param('email') email: string) {
    return this.usersService.coordinatorEmailExists(email);
  }

  @Get('stats/roles-count')
  //@Permissions('users:read')
  getUsersCountByRole() {
    return this.usersService.getUsersCountByRole();
  }
}
