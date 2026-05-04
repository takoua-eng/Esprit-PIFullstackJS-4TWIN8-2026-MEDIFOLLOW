?import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { TablerIconComponent } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { MatButtonModule } from '@angular/material/button';

import {
  ApexChart,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexPlotOptions,
  ApexFill,
  ApexMarkers,
  NgApexchartsModule,
} from 'ng-apexcharts';

import type { TrafficChartPoint } from 'src/app/services/admin-api.service';

interface Month {
  value: string;
  viewValue: string;
}

export interface ProfitExpanceChart {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  grid: ApexGrid;
  marker: ApexMarkers;
}

@Component({
  selector: 'app-profit-expenses',
  imports: [MaterialModule, TablerIconComponent, MatButtonModule, NgApexchartsModule],
  templateUrl: './profit-expenses.component.html',
})
export class AppProfitExpensesComponent implements OnChanges {
  public profitExpanceChart!: Partial<ProfitExpanceChart> | any;

  @Input() mode: 'day' | 'month' | 'year' = 'month';

  /** Données séries temps (API traffic). Si définies et non vides, remplacent les jeux statiques. */
  @Input() chartData: TrafficChartPoint[] | null = null;

  months: Month[] = [
    { value: 'mar', viewValue: 'Sep 2025' },
    { value: 'apr', viewValue: 'Oct 2025' },
    { value: 'june', viewValue: 'Nov 2025' },
  ];

  constructor() {
    this.profitExpanceChart = {
      grid: {
        borderColor: 'rgba(0,0,0,0.1)',
        strokeDashArray: 3,
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '30%',
          borderRadius: 4,
          endingShape: 'rounded',
        },
      },
      chart: {
        type: 'bar',
        height: 390,
        offsetY: 10,
        foreColor: '#adb0bb',
        fontFamily: 'inherit',
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      legend: { show: false },
      stroke: {
        show: true,
        width: 5,
        colors: ['transparent'],
      },
      tooltip: { theme: 'light' },
      yaxis: this.defaultYAxis(),
      responsive: [
        {
          breakpoint: 600,
          options: {
            plotOptions: {
              bar: {
                borderRadius: 3,
              },
            },
          },
        },
      ],
    };

    this.refreshChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] || changes['chartData']) {
      this.refreshChart();
    }
  }

  /** Données API prioritaires ; sinon graphique de démo selon le mode. */
  private refreshChart(): void {
    if (this.chartData && this.chartData.length > 0) {
      this.applyApiChartData(this.chartData);
    } else {
      this.updateChartForMode(this.mode);
    }
  }

  private defaultXAxisStyle(): Partial<ApexXAxis> {
    return {
      type: 'category',
      axisTicks: { show: false },
      axisBorder: { show: false },
      labels: {
        style: { cssClass: 'grey--text lighten-2--text fill-color' },
      },
    };
  }

  private defaultYAxis(): ApexYAxis {
    return {
      tickAmount: 4,
      labels: {
        style: { cssClass: 'grey--text lighten-2--text fill-color' },
      },
    };
  }

  private applyApiChartData(points: TrafficChartPoint[]): void {
    const labels = points.map((p) => String(p.label ?? ''));
    const values = points.map((p) => {
      const n = Number(p.value);
      return Number.isFinite(n) ? n : 0;
    });
    const maxVal = values.length ? Math.max(...values, 0) : 0;

    this.profitExpanceChart = {
      ...this.profitExpanceChart,
      series: [
        {
          name: 'Traffic',
          data: [...values],
          color: '#0085db',
        },
      ],
      xaxis: {
        ...this.defaultXAxisStyle(),
        categories: [...labels],
      } as ApexXAxis,
      yaxis: {
        ...this.defaultYAxis(),
        min: 0,
        max: maxVal > 0 ? undefined : 1,
      },
    };
  }

  private updateChartForMode(mode: 'day' | 'month' | 'year'): void {
    if (mode === 'day') {
      this.profitExpanceChart = {
        ...this.profitExpanceChart,
        series: [
          {
            name: 'Logins',
            data: [5, 9, 7, 10, 8, 6, 4],
            color: '#0085db',
          },
          {
            name: 'Follow-ups submitted',
            data: [3, 5, 6, 7, 5, 4, 3],
            color: '#fb977d',
          },
        ],
        xaxis: {
          ...this.defaultXAxisStyle(),
          categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        } as ApexXAxis,
        yaxis: this.defaultYAxis(),
      };
    } else if (mode === 'month') {
      this.profitExpanceChart = {
        ...this.profitExpanceChart,
        series: [
          {
            name: 'Active patients',
            data: [30, 40, 32, 50, 42, 55, 45],
            color: '#0085db',
          },
          {
            name: 'New registrations',
            data: [10, 18, 15, 20, 17, 22, 19],
            color: '#fb977d',
          },
        ],
        xaxis: {
          ...this.defaultXAxisStyle(),
          categories: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
        } as ApexXAxis,
        yaxis: this.defaultYAxis(),
      };
    } else {
      this.profitExpanceChart = {
        ...this.profitExpanceChart,
        series: [
          {
            name: 'Active patients',
            data: [20, 25, 30, 35, 40, 45, 50, 52, 54, 56, 58, 60],
            color: '#0085db',
          },
          {
            name: 'New registrations',
            data: [5, 8, 10, 12, 15, 18, 20, 19, 17, 16, 14, 12],
            color: '#fb977d',
          },
        ],
        xaxis: {
          ...this.defaultXAxisStyle(),
          categories: [
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
          ],
        } as ApexXAxis,
        yaxis: this.defaultYAxis(),
      };
    }
  }
}
