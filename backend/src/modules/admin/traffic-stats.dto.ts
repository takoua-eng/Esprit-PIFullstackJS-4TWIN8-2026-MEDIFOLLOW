export type TrafficStatsMode = 'day' | 'month' | 'year';

export interface TrafficChartPointDto {
  label: string;
  value: number;
  newPatients?: number;
}

export interface TrafficStatsResponseDto {
  visits: number;
  uniqueUsers: number;
  pageViews: number;
  newPatients: number;
  /** Entre 0 et 100 : part des questionnaires complétés (`status: completed`) sur la période. */
  followUpRate: number;
  chartData: TrafficChartPointDto[];
}
