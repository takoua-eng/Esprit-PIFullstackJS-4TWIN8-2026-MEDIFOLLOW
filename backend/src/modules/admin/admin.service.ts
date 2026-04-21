import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { UserDocument } from '../users/users.schema';
import {
  QuestionnaireResponse,
  QuestionnaireResponseDocument,
} from '../questionnaire-responses/questionnaire-response.schema';
import {
  Questionnaire,
  QuestionnaireDocument,
} from '../questionnaires/questionnaires.schema';
import {
  Patient,
  Physician,
  Nurse,
  Coordinator,
  Auditor,
} from './admin.models';
import { AdminStatsDto } from './admin-stats.dto';
import {
  TrafficChartPointDto,
  TrafficStatsMode,
  TrafficStatsResponseDto,
} from './traffic-stats.dto';
import { TrafficEvent, TrafficEventDocument } from './traffic-event.schema';

/** Aligné sur {@link UsersService} / `findPatients`. */
const DEFAULT_PATIENT_ROLE_OBJECT_ID = '69c44e6ce03c22d3ff723db5';

const DEFAULT_ACTIVE_PATIENT_DAYS = 30;

const MONTH_SHORT_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function startOfCurrentMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** Lundi 00:00:00 (locale) de la semaine courante. */
function startOfCurrentWeekMonday(): Date {
  const d = new Date();
  const day = d.getDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function activeSinceDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDateRangeForMode(mode: TrafficStatsMode): { start: Date; end: Date } {
  const now = new Date();
  switch (mode) {
    case 'day': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end };
    }
  }
}

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(Patient.name)
    private readonly patientModel: Model<UserDocument>,
    @InjectModel(Physician.name)
    private readonly physicianModel: Model<UserDocument>,
    @InjectModel(Nurse.name)
    private readonly nurseModel: Model<UserDocument>,
    @InjectModel(Coordinator.name)
    private readonly coordinatorModel: Model<UserDocument>,
    @InjectModel(Auditor.name)
    private readonly auditorModel: Model<UserDocument>,
    @InjectModel(TrafficEvent.name)
    private readonly trafficEventModel: Model<TrafficEventDocument>,
    @InjectModel(QuestionnaireResponse.name)
    private readonly questionnaireResponseModel: Model<QuestionnaireResponseDocument>,
    @InjectModel(Questionnaire.name)
    private readonly questionnaireModel: Model<QuestionnaireDocument>,
    private readonly config: ConfigService,
  ) {}

  private async resolveRoleIdByName(name: string): Promise<Types.ObjectId | null> {
    const roleCol = this.patientModel.db.collection('roles');
    const doc = await roleCol.findOne<{ _id: Types.ObjectId }>({ name });
    return doc?._id ?? null;
  }

  private async resolvePatientRoleId(): Promise<Types.ObjectId | null> {
    const byName = await this.resolveRoleIdByName('patient');
    if (byName) {
      return byName;
    }
    const id =
      this.config.get<string>('PATIENT_ROLE_ID')?.trim() ||
      DEFAULT_PATIENT_ROLE_OBJECT_ID;
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
  }

  private activeFilter(roleId: Types.ObjectId | null) {
    return roleId
      ? { role: roleId, isArchived: { $ne: true } }
      : null;
  }

  private getActivePatientDays(): number {
    const raw = this.config.get<string>('ACTIVE_PATIENT_DAYS');
    const n = raw != null && raw !== '' ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_ACTIVE_PATIENT_DAYS;
  }

  /**
   * Une seule requête sur `users` : $match non archivés puis $facet avec trois branches
   * ($count), puis projection des champs `n` issus de chaque branche.
   */
  private async aggregatePeriodStats(
    patientRoleId: Types.ObjectId | null,
  ): Promise<{
    patientsThisMonth: number;
    newUsersThisWeek: number;
    activePatients: number;
  }> {
    if (!patientRoleId) {
      return {
        patientsThisMonth: 0,
        newUsersThisWeek: 0,
        activePatients: 0,
      };
    }

    const monthStart = startOfCurrentMonth();
    const weekStart = startOfCurrentWeekMonday();
    const activitySince = activeSinceDate(this.getActivePatientDays());

    const pipeline: PipelineStage[] = [
      { $match: { isArchived: { $ne: true } } },
      {
        $facet: {
          patientsThisMonth: [
            {
              $match: {
                role: patientRoleId,
                createdAt: { $gte: monthStart },
              },
            },
            { $count: 'n' },
          ],
          newUsersThisWeek: [
            { $match: { createdAt: { $gte: weekStart } } },
            { $count: 'n' },
          ],
          activePatients: [
            {
              $match: {
                role: patientRoleId,
                updatedAt: { $gte: activitySince },
              },
            },
            { $count: 'n' },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          pm: { $arrayElemAt: ['$patientsThisMonth', 0] },
          nw: { $arrayElemAt: ['$newUsersThisWeek', 0] },
          ap: { $arrayElemAt: ['$activePatients', 0] },
        },
      },
      {
        $project: {
          patientsThisMonth: { $ifNull: ['$pm.n', 0] },
          newUsersThisWeek: { $ifNull: ['$nw.n', 0] },
          activePatients: { $ifNull: ['$ap.n', 0] },
        },
      },
    ];

    const rows = await this.patientModel
      .aggregate<{
        patientsThisMonth: number;
        newUsersThisWeek: number;
        activePatients: number;
      }>(pipeline)
      .exec();

    const row = rows[0];
    return {
      patientsThisMonth: row?.patientsThisMonth ?? 0,
      newUsersThisWeek: row?.newUsersThisWeek ?? 0,
      activePatients: row?.activePatients ?? 0,
    };
  }

  async getStats(): Promise<AdminStatsDto> {
    const [patientRoleId, doctorRoleId, nurseRoleId, coordinatorRoleId, auditorRoleId] =
      await Promise.all([
        this.resolvePatientRoleId(),
        this.resolveRoleIdByName('doctor'),
        this.resolveRoleIdByName('nurse'),
        this.resolveRoleIdByName('coordinator'),
        this.resolveRoleIdByName('auditor'),
      ]);

    const count = async (
      model: Model<UserDocument>,
      roleId: Types.ObjectId | null,
    ): Promise<number> => {
      const filter = this.activeFilter(roleId);
      if (!filter) {
        return 0;
      }
      return model.countDocuments(filter).exec();
    };

    const [
      totalPatients,
      totalPhysicians,
      totalNurses,
      totalCoordinators,
      totalAuditors,
      periodStats,
    ] = await Promise.all([
      count(this.patientModel, patientRoleId),
      count(this.physicianModel, doctorRoleId),
      count(this.nurseModel, nurseRoleId),
      count(this.coordinatorModel, coordinatorRoleId),
      count(this.auditorModel, auditorRoleId),
      this.aggregatePeriodStats(patientRoleId),
    ]);

    return {
      totalPatients,
      totalPhysicians,
      totalNurses,
      totalCoordinators,
      totalAuditors,
      patientsThisMonth: periodStats.patientsThisMonth,
      newUsersThisWeek: periodStats.newUsersThisWeek,
      activePatients: periodStats.activePatients,
    };
  }

  async getTrafficStats(mode: TrafficStatsMode): Promise<TrafficStatsResponseDto> {
    const { start, end } = getDateRangeForMode(mode);
    const patientRoleId = await this.resolvePatientRoleId();

    const [newPatients, trafficInRange, followUpRate] = await Promise.all([
      patientRoleId
        ? this.patientModel.countDocuments({
            role: patientRoleId,
            isArchived: { $ne: true },
            createdAt: { $gte: start, $lte: end },
          })
        : Promise.resolve(0),
      this.trafficEventModel.countDocuments({
        createdAt: { $gte: start, $lte: end },
      }),
      this.computeCompletedQuestionnaireRate(start, end),
    ]);

    if (trafficInRange > 0) {
      return this.buildTrafficStatsFromEvents(
        start,
        end,
        mode,
        newPatients,
        followUpRate,
      );
    }

    return this.buildTrafficStatsFromQuestionnaires(
      start,
      end,
      mode,
      newPatients,
      followUpRate,
    );
  }

  /** % de questionnaires `status: completed` parmi ceux créés sur la période. */
  private async computeCompletedQuestionnaireRate(
    start: Date,
    end: Date,
  ): Promise<number> {
    const rows = await this.questionnaireModel
      .aggregate<{ total: number; completed: number }>([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
              },
            },
          },
        },
      ])
      .exec();

    const row = rows[0];
    const total = row?.total ?? 0;
    const completed = row?.completed ?? 0;
    if (total === 0) {
      return 0;
    }
    return Math.round((completed / total) * 10000) / 100;
  }

  /**
   * visits : entrées `kind: visit` ou, à défaut, nombre de sessions distinctes.
   * pageViews : total des événements (requêtes / logs).
   * uniqueUsers : utilisateurs distincts (`userId`).
   */
  private async buildTrafficStatsFromEvents(
    start: Date,
    end: Date,
    mode: TrafficStatsMode,
    newPatients: number,
    followUpRate: number,
  ): Promise<TrafficStatsResponseDto> {
    const dateMatch = { createdAt: { $gte: start, $lte: end } };

    const [
      visitLogCount,
      sessionsAgg,
      pageViews,
      uniqueUserAgg,
      chartData,
    ] = await Promise.all([
      this.trafficEventModel.countDocuments({ ...dateMatch, kind: 'visit' }),
      this.trafficEventModel
        .aggregate<{ n: number }>([
          { $match: dateMatch },
          { $group: { _id: '$sessionId' } },
          { $count: 'n' },
        ])
        .exec(),
      this.trafficEventModel.countDocuments(dateMatch),
      this.trafficEventModel
        .aggregate<{ n: number }>([
          {
            $match: {
              ...dateMatch,
              userId: { $exists: true, $ne: null },
            },
          },
          { $group: { _id: '$userId' } },
          { $count: 'n' },
        ])
        .exec(),
      this.aggregateTrafficChartSeries(this.trafficEventModel, start, end, mode, { newPatients: true, start, end, mode }),
    ]);

    const sessionCount = sessionsAgg[0]?.n ?? 0;
    const visits = visitLogCount > 0 ? visitLogCount : sessionCount;

    return {
      visits,
      uniqueUsers: uniqueUserAgg[0]?.n ?? 0,
      pageViews,
      newPatients,
      followUpRate,
      chartData,
    };
  }

  /**
   * Sans `traffic_events` : proxy via réponses questionnaire.
   * visits = patients distincts (sessions), pageViews = nombre total de soumissions.
   */
  private async buildTrafficStatsFromQuestionnaires(
    start: Date,
    end: Date,
    mode: TrafficStatsMode,
    newPatients: number,
    followUpRate: number,
  ): Promise<TrafficStatsResponseDto> {
    const dateMatch = { createdAt: { $gte: start, $lte: end } };

    const [pageViews, uniquePatientsAgg, chartData] = await Promise.all([
      this.questionnaireResponseModel.countDocuments(dateMatch),
      this.questionnaireResponseModel
        .aggregate<{ n: number }>([
          { $match: dateMatch },
          { $group: { _id: '$patientId' } },
          { $count: 'n' },
        ])
        .exec(),
      this.aggregateTrafficChartSeries(
        this.questionnaireResponseModel,
        start,
        end,
        mode,
        { newPatients: true, start, end, mode }
      ),
    ]);

    const uniqueUsers = uniquePatientsAgg[0]?.n ?? 0;

    return {
      visits: uniqueUsers,
      uniqueUsers,
      pageViews,
      newPatients,
      followUpRate,
      chartData,
    };
  }

  /** $match + $group (jour=heure, mois=jour, année=mois) + $sort, puis libellés formatés. */
  private async aggregateTrafficChartSeries(
    model: Model<TrafficEventDocument | QuestionnaireResponseDocument>,
    start: Date,
    end: Date,
    mode: TrafficStatsMode,
    options?: { newPatients?: boolean; start: Date; end: Date; mode: TrafficStatsMode }
  ): Promise<TrafficChartPointDto[]> {
    const groupStage: PipelineStage =
      mode === 'day'
        ? { $group: { _id: { $hour: '$createdAt' }, value: { $sum: 1 } } }
        : mode === 'month'
          ? { $group: { _id: { $dayOfMonth: '$createdAt' }, value: { $sum: 1 } } }
          : { $group: { _id: { $month: '$createdAt' }, value: { $sum: 1 } } };

    let newPatientRows: { _id: unknown; value: number }[] = [];
    if (options?.newPatients) {
      const patientRoleId = await this.resolvePatientRoleId();
      if (patientRoleId) {
        newPatientRows = await this.patientModel.aggregate<{ _id: number; value: number }>([
          { $match: { createdAt: { $gte: options.start, $lte: options.end }, role: patientRoleId, isArchived: { $ne: true } } },
          groupStage,
        ]).exec();
      }
    }

    const rows = await model
      .aggregate<{ _id: number; value: number }>([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        groupStage,
        { $sort: { _id: 1 } },
      ])
      .exec();

    return this.formatChartFromAggregation(mode, rows, newPatientRows);
  }

  private formatChartFromAggregation(
    mode: TrafficStatsMode,
    rows: { _id: unknown; value: number }[],
    newPatientRows?: { _id: unknown; value: number }[],
  ): TrafficChartPointDto[] {
    const bucketKey = (id: unknown) => Number(id);
    const valueFor = (key: number) =>
      rows.find((r) => bucketKey(r._id) === key)?.value ?? 0;
    const newPatientsFor = (key: number) =>
      newPatientRows?.find((r) => bucketKey(r._id) === key)?.value ?? 0;

    if (mode === 'day') {
      return Array.from({ length: 24 }, (_, h) => ({
        label: `${h}h`,
        value: valueFor(h),
        newPatients: newPatientsFor(h)
      }));
    }

    if (mode === 'month') {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      return Array.from({ length: lastDay }, (_, i) => {
        const d = i + 1;
        return { label: String(d), value: valueFor(d), newPatients: newPatientsFor(d) };
      });
    }

    return MONTH_SHORT_LABELS.map((label, i) => ({
      label,
      value: valueFor(i + 1),
      newPatients: newPatientsFor(i + 1)
    }));
  }
}
