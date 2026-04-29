export type TrafficStatsMode = 'day' | 'month' | 'year';

export interface TrafficChartPointDto {
  label: string;
  value: number;
  newPatients?: number;
}

export interface TrafficStatsResponseDto {
  visits:      number;
  uniqueUsers: number;
  pageViews:   number;
  newPatients: number;
  followUpRate: number;
  chartData:   TrafficChartPointDto[];
}