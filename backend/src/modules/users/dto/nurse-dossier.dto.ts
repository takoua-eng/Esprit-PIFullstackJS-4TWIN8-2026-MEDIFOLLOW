export class MedicationItemDto {
  medication!: string;
  dose?: string;
  frequency?: string;
  startDate?: string;
}

export class MedicalHistoryFlagsDto {
  diabetes?: boolean;
  hypertension?: boolean;
  heartDisease?: boolean;
  asthmaOrCOPD?: boolean;
  cancer?: boolean;
  otherConditions?: string;
}

export class PrimaryDiagnosisInfoDto {
  condition?: string;
  notes?: string;
}

export class MonitoringConfigDto {
  glucoseMonitoring?: boolean;
  isMonitoringActive?: boolean;
  monitoringStartDate?: string;
}

export class NurseDossierDto {
  // Legacy flat hospitalization
  admissionDate?: string;
  dischargeDate?: string;
  dischargeUnit?: string;
  primaryDiagnosis?: string;
  hospitalizationReason?: string;
  secondaryDiagnoses?: string;
  proceduresPerformed?: string;
  dischargeSummaryNotes?: string;
  diagnosisEntries?: unknown[];

  // Physical profile
  height?: number;
  weight?: number;
  bloodType?: string;

  // Antécédents
  medicalHistory?: MedicalHistoryFlagsDto;

  // Diagnostic
  primaryDiagnosisInfo?: PrimaryDiagnosisInfoDto;

  // Medications (structured)
  medicationsList?: MedicationItemDto[];

  // Medications (legacy)
  currentMedications?: string;

  // Monitoring
  monitoringConfig?: MonitoringConfigDto;

  allergies?: string;
  pastMedicalHistory?: string;
  substanceUse?: string;
  familyHistory?: string;
}
