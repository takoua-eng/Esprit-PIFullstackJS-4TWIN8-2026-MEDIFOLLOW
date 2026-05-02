import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateTemplateDto } from './dto/create-template.dto';
import { ParseMongoIdPipe } from './pipes/parse-mongo-id.pipe';
import { QuestionnaireTemplateService } from './questionnaire-template.service';

@Controller('questionnaire-templates')
export class QuestionnaireTemplateController {
  constructor(
    private readonly questionnaireTemplateService: QuestionnaireTemplateService,
  ) {}

  @Post()
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  create(@Body() dto: CreateTemplateDto) {
    return this.questionnaireTemplateService.create(dto);
  }

  @Get()
  findAll() {
    return this.questionnaireTemplateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseMongoIdPipe) id: string) {
    return this.questionnaireTemplateService.findOne(id);
  }
}
