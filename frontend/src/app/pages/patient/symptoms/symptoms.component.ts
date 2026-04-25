import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PatientService } from 'src/app/services/patient.service';
import { VoiceAssistantService } from 'src/app/services/voice-assistant.service';

@Component({
  selector: 'app-symptoms',
  imports: [MaterialModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './symptoms.component.html',
  styleUrl: './symptoms.component.scss',
})
export class SymptomsComponent implements OnInit, OnDestroy {
  symptomsForm: FormGroup;
  isLoading = false;
  successMessage = '';
  errorMessage = '';
  submittedToday = false;

  // control: 'scale' -> score input always present; 'checkbox' -> boolean checkbox (may have optional scale)
  availableSymptoms = [
    { name: 'douleur',           label: 'Pain',                   control: 'scale',    maxScale: 10 },
    { name: 'fatigue',           label: 'Fatigue',                control: 'scale',    maxScale: 5  },
    { name: 'perteDAppetit',     label: 'Loss of appetite',       control: 'scale',    maxScale: 5  },
    { name: 'fievre',            label: 'Fever',                  control: 'checkbox' },
    { name: 'douleurThoracique', label: 'Chest pain',             control: 'scale',    maxScale: 10 },
    { name: 'palpitations',      label: 'Palpitations',           control: 'checkbox' },
    { name: 'essoufflement',     label: 'Shortness of breath',    control: 'scale',    maxScale: 5  },
    { name: 'toux',              label: 'Cough',                  control: 'checkbox' },
    { name: 'expectoration',     label: 'Expectoration',          control: 'checkbox' },
    { name: 'nausee',            label: 'Nausea',                 control: 'scale',    maxScale: 5  },
    { name: 'vomissements',      label: 'Vomiting',               control: 'checkbox' },
    { name: 'diarrhee',          label: 'Diarrhea',               control: 'checkbox' },
    { name: 'vertiges',          label: 'Dizziness',              control: 'checkbox' },
    { name: 'confusion',         label: 'Confusion',              control: 'checkbox' },
  ];

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private va: VoiceAssistantService,
  ) {
    const formControls: any = {};
    this.availableSymptoms.forEach(symptom => {
      if (symptom.control === 'checkbox') {
        formControls[symptom.name] = [false];
        if (symptom.maxScale && symptom.maxScale > 0) {
          formControls[symptom.name + 'Scale'] = [0, [Validators.min(0), Validators.max(symptom.maxScale ?? 10)]];
        }
      } else if (symptom.control === 'scale') {
        formControls[symptom.name + 'Scale'] = [0, [Validators.min(0), Validators.max(symptom.maxScale ?? 10)]];
      } else {
        formControls[symptom.name] = [false];
      }
    });
    formControls['notes'] = [''];
    this.symptomsForm = this.fb.group(formControls);
  }

  ngOnInit(): void {
    this.va.registerForm({
      pageId: 'symptoms',
      fields: [
        { name: 'douleur',           type: 'checkbox', label: { fr: 'Douleur', ar: 'ألم', en: 'Do you have pain?' } },
        { name: 'douleurScale',      type: 'number',   label: { fr: 'Niveau de douleur (0 à 10)', ar: 'مستوى الألم (0 إلى 10)', en: 'Pain level (0 to 10)' },            min: 0, max: 10 },
        { name: 'fatigue',           type: 'checkbox', label: { fr: 'Fatigue', ar: 'إرهاق', en: 'Do you feel fatigue?' } },
        { name: 'fatigueScale',      type: 'number',   label: { fr: 'Niveau de fatigue (0 à 5)', ar: 'مستوى التعب (0 إلى 5)', en: 'Fatigue level (0 to 5)' },          min: 0, max: 5 },
        { name: 'perteDAppetit',     type: 'checkbox', label: { fr: 'Perte d\'appétit', ar: 'فقدان الشهية', en: 'Do you have loss of appetite?' } },
        { name: 'perteDAppetitScale',type: 'number',   label: { fr: 'Perte d\'appétit (0 à 5)', ar: 'فقدان الشهية (0 إلى 5)', en: 'Appetite loss (0 to 5)' },          min: 0, max: 5 },
        { name: 'fievre',            type: 'checkbox', label: { fr: 'Fièvre', ar: 'حمى', en: 'Do you feel feverish?' } },
        { name: 'douleurThoracique', type: 'checkbox', label: { fr: 'Douleur thoracique', ar: 'ألم في الصدر', en: 'Do you have chest pain?' } },
        { name: 'douleurThoraciqueScale', type: 'number', label: { fr: 'Douleur thoracique (0 à 10)', ar: 'ألم الصدر (0 إلى 10)', en: 'Chest pain (0 to 10)' },            min: 0, max: 10 },
        { name: 'palpitations',      type: 'checkbox', label: { fr: 'Palpitations', ar: 'خفقان', en: 'Do you have palpitations?' } },
        { name: 'essoufflement',     type: 'checkbox', label: { fr: 'Essoufflement', ar: 'ضيق التنفس', en: 'Do you have shortness of breath?' } },
        { name: 'essoufflementScale',type: 'number',   label: { fr: 'Essoufflement (0 à 5)', ar: 'ضيق التنفس (0 إلى 5)', en: 'Breathing difficulty (0 to 5)' },   min: 0, max: 5 },
        { name: 'toux',              type: 'checkbox', label: { fr: 'Toux', ar: 'سعال', en: 'Do you have a cough?' } },
        { name: 'expectoration',     type: 'checkbox', label: { fr: 'Expectoration', ar: 'بلغم', en: 'Do you have expectoration?' } },
        { name: 'nausee',            type: 'checkbox', label: { fr: 'Nausée', ar: 'غثيان', en: 'Do you have nausea?' } },
        { name: 'nauseeScale',       type: 'number',   label: { fr: 'Nausées (0 à 5)', ar: 'الغثيان (0 إلى 5)', en: 'Nausea level (0 to 5)' },           min: 0, max: 5 },
        { name: 'vomissements',      type: 'checkbox', label: { fr: 'Vomissements', ar: 'قيء', en: 'Do you have vomiting?' } },
        { name: 'diarrhee',          type: 'checkbox', label: { fr: 'Diarrhée', ar: 'إسهال', en: 'Do you have diarrhea?' } },
        { name: 'vertiges',          type: 'checkbox', label: { fr: 'Vertiges', ar: 'دوخة', en: 'Do you have dizziness?' } },
        { name: 'confusion',         type: 'checkbox', label: { fr: 'Confusion', ar: 'ارتباك', en: 'Do you have mental confusion?' } },
        { name: 'notes',             type: 'text',     label: { fr: 'Notes supplémentaires (optionnel)', ar: 'ملاحظات إضافية (اختياري)', en: 'Additional notes (optional)' } },
      ],
      onFillField: (name, value) => {
        const ctrl = this.symptomsForm.get(name);
        if (ctrl) { ctrl.setValue(value); ctrl.markAsDirty(); }
      },
      onSubmit: () => this.onSubmit(),
    });

    // Check whether symptoms were already entered today
    this.patientService.hasEnteredSymptomsToday().subscribe({
      next: (res) => { this.submittedToday = !!res; },
      error: () => { this.submittedToday = false; },
    });
  }

  ngOnDestroy(): void {
    this.va.unregisterForm();
  }

  getFormControl(key: string): FormControl {
    return this.symptomsForm.get(key) as FormControl;
  }

  onSubmit() {
    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    const fv = this.symptomsForm.value;

    // Build selected symptoms: include checkbox items that are true
    // and scored items where the score > 0
    const selectedSymptoms: string[] = this.availableSymptoms
      .filter(s => {
        if (s.control === 'checkbox') return !!fv[s.name];
        if (s.control === 'scale') return Number(fv[s.name + 'Scale'] ?? 0) > 0;
        return !!fv[s.name];
      })
      .map(s => s.name);

    const payload: any = {
      symptoms: selectedSymptoms,
      // Scored fields (always sent, default 0)
      painLevel: Number(fv['douleurScale'] ?? 0),
      fatigueLevel: Number(fv['fatigueScale'] ?? 0),
      chestPain: Number(fv['douleurThoraciqueScale'] ?? 0),
      breathingDifficulty: Number(fv['essoufflementScale'] ?? 0),
      nauseaLevel: Number(fv['nauseeScale'] ?? 0),
      appetiteLoss: Number(fv['perteDAppetitScale'] ?? 0),

      // Booleans (some derived from scored fields for compatibility)
      shortnessOfBreath: Number(fv['essoufflementScale'] ?? 0) > 0,
      nausea: Number(fv['nauseeScale'] ?? 0) > 0,
      palpitations: Boolean(fv['palpitations']) || undefined,
      expectoration: Boolean(fv['expectoration']) || undefined,
      vomiting: Boolean(fv['vomissements']) || undefined,
      diarrhea: Boolean(fv['diarrhee']) || undefined,
      confusion: Boolean(fv['confusion']) || undefined,

      description: fv['notes'] ?? '',
      reportedAt: new Date().toISOString(),
    };

    this.patientService.submitSymptoms(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Symptoms saved successfully!';
        this.symptomsForm.reset();
        this.submittedToday = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Failed to save. Please check your connection.';
      },
    });
  }
}