import { Component, OnInit } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { PatientService, VitalEntry, SymptomEntry } from 'src/app/services/patient.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-history',
  imports: [NgApexchartsModule, MaterialModule, CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  temperatureChartOptions: any;
  weightChartOptions: any;
  heartRateChartOptions: any;
  bloodPressureChartOptions: any;
  oxygenChartOptions: any;
  glucoseChartOptions: any;
  respiratoryChartOptions: any;

  symptoms: SymptomEntry[] = [];
  // map internal symptom keys to friendly English labels for history display
  symptomLabelMap: Record<string, string> = {
    douleur: 'Pain',
    fatigue: 'Fatigue',
    perteDAppetit: 'Loss of appetite',
    fievre: 'Fever',
    douleurThoracique: 'Chest pain',
    palpitations: 'Palpitations',
    essoufflement: 'Shortness of breath',
    toux: 'Cough',
    expectoration: 'Expectoration',
    nausee: 'Nausea',
    vomissements: 'Vomiting',
    diarrhee: 'Diarrhea',
    vertiges: 'Dizziness',
    confusion: 'Confusion',
  };
  expandedSymptom: SymptomEntry | null = null;
  isLoading = true;
  hasData = false;

  constructor(private patientService: PatientService) {}

  ngOnInit() {
    forkJoin({
      vitals: this.patientService.getMyVitals(),
      symptoms: this.patientService.getMySymptoms(),
    }).subscribe({
      next: ({ vitals, symptoms }) => {
        this.symptoms = symptoms.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
        this.hasData = vitals.length > 0;
        if (vitals.length > 0) {
          this.buildCharts(vitals);
        }
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  toggleDetails(entry: SymptomEntry) {
    this.expandedSymptom = this.expandedSymptom === entry ? null : entry;
  }

  buildCharts(vitals: VitalEntry[]) {
    const sorted = [...vitals].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );

    const dates = sorted.map(v => new Date(v.recordedAt).toLocaleDateString('en-GB'));
    const temperatures = sorted.map(v => v.temperature ?? null);
    const weights = sorted.map(v => v.weight ?? null);
    const heartRates = sorted.map(v => v.heartRate ?? null);
    const systolic = sorted.map(v => v.bloodPressuresystolic ?? null);
    const diastolic = sorted.map(v => v.bloodPressureDiastolic ?? null);
    const oxygen = sorted.map(v => v.oxygenSaturation ?? null);
    const respiratory = sorted.map(v => v.respiratoryRate ?? null);
    const glucose = sorted.map(v => {
      if (v.glucoseLevel !== undefined && v.glucoseLevel !== null) return v.glucoseLevel;
      if (v.bloodGlucose !== undefined && v.bloodGlucose !== null) return Number(v.bloodGlucose) / 100; // mg/dL -> g/L
      return null;
    });

    const baseChart = (height = 280) => ({ type: 'line', height, toolbar: { show: false } });
    const baseXaxis = (cats: string[]) => ({ categories: cats, labels: { style: { fontSize: '11px' } } });
    const baseYaxis = (title: string) => ({ title: { text: title } });

    this.temperatureChartOptions = {
      series: [{ name: 'Temperature (°C)', data: temperatures }],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('°C'),
      title: { text: 'Temperature Trend' },
      colors: ['#e53935'],
      markers: { size: 5 },
      annotations: {
        yaxis: [
          { y: 38.5, borderColor: '#ff5722', label: { text: 'High threshold', style: { color: '#fff', background: '#ff5722' } } },
          { y: 35, borderColor: '#42a5f5', label: { text: 'Low threshold', style: { color: '#fff', background: '#42a5f5' } } },
        ],
      },
    };

    this.weightChartOptions = {
      series: [{ name: 'Weight (kg)', data: weights }],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('kg'),
      title: { text: 'Weight Trend' },
      colors: ['#7b1fa2'],
      markers: { size: 5 },
    };

    this.heartRateChartOptions = {
      series: [{ name: 'Heart Rate (bpm)', data: heartRates }],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('bpm'),
      title: { text: 'Heart Rate Trend' },
      colors: ['#d32f2f'],
      markers: { size: 5 },
      annotations: {
        yaxis: [
          { y: 120, borderColor: '#ff5722', label: { text: 'High threshold', style: { color: '#fff', background: '#ff5722' } } },
          { y: 50, borderColor: '#42a5f5', label: { text: 'Low threshold', style: { color: '#fff', background: '#42a5f5' } } },
        ],
      },
    };

    this.bloodPressureChartOptions = {
      series: [
        { name: 'Systolic (mmHg)', data: systolic },
        { name: 'Diastolic (mmHg)', data: diastolic },
      ],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('mmHg'),
      title: { text: 'Blood Pressure Trend' },
      colors: ['#1565c0', '#0288d1'],
      markers: { size: 5 },
    };

    this.oxygenChartOptions = {
      series: [{ name: 'Oxygen Saturation (%)', data: oxygen }],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('%'),
      title: { text: 'Oxygen Saturation' },
      colors: ['#43a047'],
      markers: { size: 5 },
      annotations: { yaxis: [{ y: 90, borderColor: '#ff5722', label: { text: 'Critical < 90%', style: { color: '#fff', background: '#ff5722' } } }] },
    };

    this.glucoseChartOptions = {
      series: [{ name: 'Average Glucose (g/L)', data: glucose }],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('g/L'),
      title: { text: 'Average Glucose (g/L)' },
      colors: ['#ff9800'],
      markers: { size: 5 },
    };

    this.respiratoryChartOptions = {
      series: [{ name: 'Respiratory Rate (resp/min)', data: respiratory }],
      chart: baseChart(),
      xaxis: baseXaxis(dates),
      yaxis: baseYaxis('resp/min'),
      title: { text: 'Respiratory Rate' },
      colors: ['#6a1b9a'],
      markers: { size: 5 },
      annotations: { yaxis: [ { y: 30, borderColor: '#ff5722', label: { text: 'High threshold', style: { color: '#fff', background: '#ff5722' } } }, { y: 8, borderColor: '#42a5f5', label: { text: 'Low threshold', style: { color: '#fff', background: '#42a5f5' } } } ] },
    };
  }
}