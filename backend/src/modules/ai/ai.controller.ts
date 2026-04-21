import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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
}
