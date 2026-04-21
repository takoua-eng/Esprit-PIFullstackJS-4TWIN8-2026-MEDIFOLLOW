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

  availableSymptoms = [
    { name: 'douleur', label: 'Douleur', scale: true },
    { name: 'fatigue', label: 'Fatigue', scale: true },
    { name: 'essoufflement', label: 'Essoufflement', scale: true },
    { name: 'nausee', label: 'Nausée', scale: true },
    { name: 'vertiges', label: 'Vertiges', scale: false },
    { name: 'toux', label: 'Toux', scale: false },
    { name: 'fievre', label: 'Fièvre', scale: false },
  ];

  constructor(
    private fb: FormBuilder,
    private patientService: PatientService,
    private va: VoiceAssistantService,
  ) {
    const formControls: any = {};
    this.availableSymptoms.forEach(symptom => {
      formControls[symptom.name] = [false];
      if (symptom.scale) {
        formControls[symptom.name + 'Scale'] = [0, [Validators.min(0), Validators.max(10)]];
      }
    });
    formControls['notes'] = [''];
    this.symptomsForm = this.fb.group(formControls);
  }

  ngOnInit(): void {
    this.va.registerForm({
      pageId: 'symptoms',
      fields: [
        { name: 'douleur',        type: 'checkbox', label: { fr: 'Avez-vous de la douleur ?',         ar: 'هل لديك ألم؟',              en: 'Do you have pain?' } },
        { name: 'douleurScale',   type: 'number',   label: { fr: 'Niveau de douleur (0 à 10)',        ar: 'مستوى الألم (0 إلى 10)',     en: 'Pain level (0 to 10)' },   min: 0, max: 10 },
        { name: 'fatigue',        type: 'checkbox', label: { fr: 'Avez-vous de la fatigue ?',         ar: 'هل تشعر بالتعب؟',           en: 'Do you feel fatigue?' } },
        { name: 'fatigueScale',   type: 'number',   label: { fr: 'Niveau de fatigue (0 à 10)',        ar: 'مستوى التعب (0 إلى 10)',     en: 'Fatigue level (0 to 10)' }, min: 0, max: 10 },
        { name: 'essoufflement',  type: 'checkbox', label: { fr: 'Avez-vous un essoufflement ?',      ar: 'هل تعاني من ضيق التنفس؟',   en: 'Do you have shortness of breath?' } },
        { name: 'nausee',         type: 'checkbox', label: { fr: 'Avez-vous des nausées ?',           ar: 'هل تعاني من الغثيان؟',       en: 'Do you have nausea?' } },
        { name: 'vertiges',       type: 'checkbox', label: { fr: 'Avez-vous des vertiges ?',          ar: 'هل تعاني من الدوخة؟',        en: 'Do you have dizziness?' } },
        { name: 'toux',           type: 'checkbox', label: { fr: 'Avez-vous de la toux ?',            ar: 'هل لديك سعال؟',             en: 'Do you have a cough?' } },
        { name: 'fievre',         type: 'checkbox', label: { fr: 'Avez-vous de la fièvre ?',          ar: 'هل لديك حمى؟',              en: 'Do you have a fever?' } },
        { name: 'notes',          type: 'text',     label: { fr: 'Notes supplémentaires (optionnel)', ar: 'ملاحظات إضافية (اختياري)',    en: 'Additional notes (optional)' } },
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

    // Construire la liste des symptômes cochés
    const selectedSymptoms: string[] = this.availableSymptoms
      .filter(s => fv[s.name])
      .map(s => s.name);

    const payload = {
      symptoms: selectedSymptoms,
      painLevel: Number(fv['douleurScale'] ?? 0),
      fatigueLevel: Number(fv['fatigueScale'] ?? 0),
      shortnessOfBreath: Boolean(fv['essoufflement']),
      nausea: Boolean(fv['nausee']),
      description: fv['notes'] ?? '',
      reportedAt: new Date().toISOString(),
    };

    this.patientService.submitSymptoms(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Symptômes enregistrés avec succès !';
        this.symptomsForm.reset();
        this.submittedToday = true;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message ?? 'Erreur lors de l\'enregistrement.';
      },
    });
  }
}