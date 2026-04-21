import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PatientService } from 'src/app/services/patient.service';
import { VoiceAssistantService } from 'src/app/services/voice-assistant.service';

@Component({
  selector: 'app-parameters',
  imports: [MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './parameters.component.html',
  styleUrl: './parameters.component.scss',
})
export class ParametersComponent implements OnInit, OnDestroy {
  parametersForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  submittedToday = false;

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private va: VoiceAssistantService,
  ) {
    this.parametersForm = this.fb.group({
      temperature:            ['', [Validators.required, Validators.min(35), Validators.max(42)]],
      bloodPressureSystolic:  ['', [Validators.required, Validators.min(80), Validators.max(200)]],
      bloodPressureDiastolic: ['', [Validators.required, Validators.min(50), Validators.max(120)]],
      weight:                 ['', [Validators.required, Validators.min(30), Validators.max(200)]],
      heartRate:              ['', [Validators.required, Validators.min(40), Validators.max(200)]],
      notes:                  [''],
    });
  }

  ngOnInit(): void {
    this.va.registerForm({
      pageId: 'vitals',
      fields: [
        {
          name: 'temperature',
          type: 'number',
          label: { fr: 'Température en degrés Celsius', ar: 'درجة الحرارة بالسيليزيوس', en: 'Temperature in Celsius' },
          hint:  { fr: 'Valeur normale entre 36,1 et 37,2', ar: 'القيمة الطبيعية بين 36 و37 درجة', en: 'Normal range 36.1 to 37.2' },
          min: 35, max: 42,
        },
        {
          name: 'weight',
          type: 'number',
          label: { fr: 'Poids en kilogrammes', ar: 'الوزن بالكيلوغرام', en: 'Weight in kilograms' },
          min: 30, max: 200,
        },
        {
          name: 'bloodPressureSystolic',
          type: 'number',
          label: { fr: 'Pression artérielle systolique en millimètres de mercure', ar: 'ضغط الدم الانقباضي بالملليمتر زئبق', en: 'Systolic blood pressure in mmHg' },
          hint:  { fr: 'Valeur normale entre 90 et 120', ar: 'القيمة الطبيعية بين 90 و120', en: 'Normal range 90 to 120' },
          min: 80, max: 200,
        },
        {
          name: 'bloodPressureDiastolic',
          type: 'number',
          label: { fr: 'Pression artérielle diastolique en millimètres de mercure', ar: 'ضغط الدم الانبساطي بالملليمتر زئبق', en: 'Diastolic blood pressure in mmHg' },
          hint:  { fr: 'Valeur normale entre 60 et 80', ar: 'القيمة الطبيعية بين 60 و80', en: 'Normal range 60 to 80' },
          min: 50, max: 120,
        },
        {
          name: 'heartRate',
          type: 'number',
          label: { fr: 'Fréquence cardiaque en battements par minute', ar: 'معدل ضربات القلب في الدقيقة', en: 'Heart rate in beats per minute' },
          hint:  { fr: 'Valeur normale entre 60 et 100', ar: 'القيمة الطبيعية بين 60 و100', en: 'Normal range 60 to 100' },
          min: 40, max: 200,
        },
        {
          name: 'notes',
          type: 'text',
          label: { fr: 'Notes supplémentaires (optionnel)', ar: 'ملاحظات إضافية (اختياري)', en: 'Additional notes (optional)' },
        },
      ],
      onFillField: (name, value) => {
        const ctrl = this.parametersForm.get(name);
        if (ctrl) { ctrl.setValue(value); ctrl.markAsDirty(); }
      },
      onSubmit: () => this.onSubmit(),
    });

    // Check whether vitals were already entered today and disable the form if so
    this.patientService.hasEnteredVitalsToday().subscribe({
      next: (res) => { this.submittedToday = !!res; },
      error: () => { this.submittedToday = false; },
    });
  }

  ngOnDestroy(): void {
    this.va.unregisterForm();
  }

  onSubmit() {
    if (this.parametersForm.invalid) {
      this.parametersForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const formVal = this.parametersForm.value;
    const payload = {
      temperature: Number(formVal.temperature),
      bloodPressuresystolic: Number(formVal.bloodPressureSystolic),
      bloodPressureDiastolic: Number(formVal.bloodPressureDiastolic),
      weight: Number(formVal.weight),
      heartRate: Number(formVal.heartRate),
      notes: formVal.notes,
      recordedAt: new Date().toISOString(),
    };

    this.patientService.submitVitals(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Vital parameters saved successfully!';
        this.parametersForm.reset();
        this.submittedToday = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Failed to save. Please check your connection.';
      },
    });
  }
}