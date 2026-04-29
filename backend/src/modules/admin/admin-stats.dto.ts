// admin-stats.dto.ts — version complète
export class AdminStatsDto {
  // ── champs existants ────────────────────────────────
  totalPatients:     number;
  totalPhysicians:   number;
  totalNurses:       number;
  totalCoordinators: number;
  totalAuditors:     number;
  patientsThisMonth: number;
  newUsersThisWeek:  number;
  activePatients:    number;

  // ── alias frontend ───────────────────────────────────
  patients:     number;
  doctors:      number;
  nurses:       number;
  coordinators: number;

  // ── nouveaux champs dashboard ────────────────────────
  activeAlerts:   number;
  criticalAlerts: number;
  complianceRate: number;
}