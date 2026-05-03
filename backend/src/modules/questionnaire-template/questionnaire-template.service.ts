import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTemplateDto } from './dto/create-template.dto';
import {
  QuestionnaireTemplate,
  QuestionnaireTemplateDocument,
} from './questionnaire-template.schema';

@Injectable()
export class QuestionnaireTemplateService {
  private readonly logger = new Logger(QuestionnaireTemplateService.name);

  constructor(
    @InjectModel(QuestionnaireTemplate.name)
    private readonly templateModel: Model<QuestionnaireTemplateDocument>,
  ) {}

  async create(dto: CreateTemplateDto): Promise<QuestionnaireTemplateDocument> {
    try {
      const questions = dto.questions.map((q) => ({
        label: q.label,
        type: q.type,
        options: q.options ?? [],
        required: q.required ?? false,
      }));

      const created = await this.templateModel.create({
        title: dto.title,
        category: dto.category,
        allowDoctorToAddQuestions: dto.allowDoctorToAddQuestions,
        questions,
      });
      return created;
    } catch (err) {
      this.logger.error(
        `Échec de création du template: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Impossible de créer le modèle de questionnaire',
      );
    }
  }

  async findAll(): Promise<QuestionnaireTemplateDocument[]> {
    try {
      return await this.templateModel.find().sort({ _id: -1 }).exec();
    } catch (err) {
      this.logger.error(
        `Échec listage templates: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Impossible de récupérer les modèles',
      );
    }
  }

  async findOne(id: string): Promise<QuestionnaireTemplateDocument> {
    if (!id?.trim()) {
      throw new BadRequestException('Identifiant manquant');
    }

    try {
      const doc = await this.templateModel.findById(id).exec();
      if (!doc) {
        throw new NotFoundException(`Modèle de questionnaire introuvable (id: ${id})`);
      }
      return doc;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(
        `Échec lecture template ${id}: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Impossible de récupérer le modèle',
      );
    }
  }

  async update(
    id: string,
    dto: CreateTemplateDto,
  ): Promise<QuestionnaireTemplateDocument> {
    if (!id?.trim()) {
      throw new BadRequestException('Identifiant manquant');
    }

    try {
      const questions = dto.questions.map((q) => ({
        label: q.label,
        type: q.type,
        options: q.options ?? [],
        required: q.required ?? false,
      }));

      const updated = await this.templateModel
        .findByIdAndUpdate(
          id,
          {
            title: dto.title,
            category: dto.category,
            allowDoctorToAddQuestions: dto.allowDoctorToAddQuestions,
            questions,
          },
          { new: true, runValidators: true },
        )
        .exec();

      if (!updated) {
        throw new NotFoundException(
          `Modèle de questionnaire introuvable (id: ${id})`,
        );
      }
      return updated;
    } catch (err) {
      if (err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(
        `Échec mise à jour template ${id}: ${err instanceof Error ? err.message : err}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Impossible de mettre à jour le modèle',
      );
    }
  }
}
