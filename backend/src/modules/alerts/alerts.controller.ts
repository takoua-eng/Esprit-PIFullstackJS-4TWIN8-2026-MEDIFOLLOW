import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { AlertsService } from './alerts.service';
import {
  ClinicalAiSuggestionService,
  type SuggestDoctorMessageDto,
} from './clinical-ai-suggestion.service';

class AcknowledgeAlertDto {
  nurseUserId?: string;
  doctorUserId?: string;
}

class CreatePhysicianAlertDto {
  patientId: string;
  physicianUserId: string;
  severity: string;
  message?: string;
  type?: string;
  parameter?: string;
  value?: number;
  threshold?: number;
  /** When set, clinical review hides this vital/symptom row after send. */
  sourceType?: string;
  sourceId?: string;
}

@Controller('alerts')
export class AlertsController {
  constructor(
    private readonly alertsService: AlertsService,
    private readonly clinicalAiSuggestionService: ClinicalAiSuggestionService,
  ) {}

  @Get()
  findAll(
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.alertsService.findAll({ doctorId, patientId });
  }

  /** Optional `doctorId` (ignored for filtering; queue lists all patients with clinical data). */
  @Get('clinical-review-queue')
  getClinicalReviewQueue(@Query('doctorId') doctorId?: string) {
    return this.alertsService.getClinicalReviewQueue(doctorId);
  }

  /** Document counts + collection names — use when the UI is empty to match Compass / `.env` database. */
  @Get('data-summary')
  getDataSummary() {
    return this.alertsService.getAlertsDataSummary();
  }

  /**
   * Why Compass shows more `alerts` than `GET /alerts?doctorId=` — list is scoped to assigned patients or triggeredBy.
   */
  @Get('list-scope')
  getListScope(@Query('doctorId') doctorId?: string) {
    return this.alertsService.getListScopeSummary(doctorId);
  }

  /** AI-assisted (Groq when GROQ_API_KEY is set) or template patient message for doctor review. */
  @Post('doctor/suggest-message')
  async suggestDoctorMessage(@Body() body: SuggestDoctorMessageDto) {
    const preset = body?.severityPreset;
    if (preset !== 'high' && preset !== 'medium' && preset !== 'low') {
      throw new BadRequestException(
        'severityPreset must be high, medium, or low',
      );
    }
    if (!body?.patientName?.trim() || !body?.summary?.trim()) {
      throw new BadRequestException('patientName and summary are required');
    }
    return this.clinicalAiSuggestionService.suggestDoctorMessage(body);
  }

  // GET /alerts/patient/:patientId  → toutes les alertes pour un patient donné
  @Get('patient/:patientId')
  getByPatient(@Param('patientId') patientId: string, @Query('status') status?: string) {
    return this.alertsService.getByPatient(patientId, status);
  }

  @Get('stats/open-count')
  async openCount(
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
  ) {
    const count = await this.alertsService.findOpenCount({
      doctorId,
      patientId,
    });
    return { count };
  }

  @Post()
  create(@Body() body: CreatePhysicianAlertDto) {
    return this.alertsService.createPhysicianAlert(body);
  }

  @Patch(':id/acknowledge')
  acknowledge(
    @Param('id') id: string,
    @Body() body: AcknowledgeAlertDto,
  ) {
    return this.alertsService.acknowledge(
      id,
      body?.nurseUserId,
      body?.doctorUserId,
    );
  }




}
