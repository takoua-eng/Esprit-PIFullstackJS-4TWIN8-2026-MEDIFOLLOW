import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';

@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) { }

  @Get()
  findAll() {
    return this.remindersService.findAll();
  }

  @Get('by-patient')
  groupByPatient() {
    return this.remindersService.groupByPatient();
  }

  @Get('patient/:patientId')
  findByPatient(@Param('patientId') patientId: string) {
    return this.remindersService.findByPatient(patientId);
  }

  @Get('compliance')
  getComplianceSummary() {
    return this.remindersService.getComplianceSummary();
  }

  @Get('patient/:patientId/history')
  getPatientHistory(
    @Param('patientId') patientId: string,
    @Query('days') days?: number,
  ) {
    return this.remindersService.getPatientComplianceHistory(patientId, days);
  }

  @Get('stats/pending-count')
  async pendingCount() {
    const count = await this.remindersService.findPendingCount();
    return { count };
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string) {
    return this.remindersService.complete(id);
  }
}
