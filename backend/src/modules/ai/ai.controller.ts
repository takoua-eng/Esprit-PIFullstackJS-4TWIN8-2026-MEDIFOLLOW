import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /**
   * POST /ai/report
   * Super admin only — generates AI medical analysis
   * Body: { type: 'monthly' | 'risk' | 'coordinators' | 'anomalies' }
   */
  @Post('report')
  @Permissions('*')
  generateReport(@Body() body: { type: string }) {
    return this.aiService.generateReport(body.type ?? 'monthly');
  }

  @Post('audit-report')
  @Permissions('audit:read')
  generateAuditReport() {
    return this.aiService.generateAuditReport();
  }

  @Get('stroke-risk/:patientId')
  @Permissions('*')
  predictStrokeRisk(@Param('patientId') patientId: string) {
    return this.aiService.predictStrokeRisk(patientId);
  }

  @Get('stroke-risk-all')
  @Permissions('*')
  predictAllPatientsRisk() {
    return this.aiService.predictAllPatientsRisk();
  }
  @Get('service-intelligence')
  @Permissions('*')
  getServiceIntelligence() {
    return this.aiService.getServiceIntelligence();
  }

  @Post('chat')
	async chat(@Body() body: { message: string; patientContext?: any }) {
		const { message, patientContext } = body || { message: '', patientContext: undefined };
		const response = await this.aiService.chatWithPatient(message, patientContext);
		return { response };
	}
}


