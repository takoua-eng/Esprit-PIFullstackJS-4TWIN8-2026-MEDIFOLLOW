import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VitalsService } from './vitals.service';

@UseGuards(JwtAuthGuard)
@Controller('vitals')
export class VitalsController {
  constructor(private readonly vitalsService: VitalsService) {}

  @Get()
  findAll(
    @Query('patientId') patientId?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.vitalsService.findAll(patientId, {
      limit: limit ? +limit : undefined,
      skip: skip ? +skip : undefined,
    });
  }

  @Post()
  create(
    @Body()
    body: {
      patientId: string;
      recordedBy: string;
      entrySource?: 'patient' | 'nurse_assisted';
      temperature?: number;
      bloodPressure?: string;
      weight?: number;
      heartRate?: number;
      notes?: string;
      recordedAt?: string;
    },
  ) {
    return this.vitalsService.create({
      ...body,
      entrySource: body.entrySource ?? 'nurse_assisted',
    });
  }

  @Patch(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() body: { nurseUserId: string },
  ) {
    return this.vitalsService.verify(id, body.nurseUserId);
  }
}
