/**
 * Seed script: insert vital parameters AND symptoms for every patient
 * for each of the last 7 days (today inclusive).
 *
 * Usage (from backend/):
 *   npx ts-node scripts/seed-week-vitals-symptoms.ts
 *
 * Safe to re-run: skips patients that already have data on a given day.
 */

import * as dns from 'dns';
import mongoose, { Types } from 'mongoose';

// Use public DNS so that mongodb+srv SRV lookups resolve on all networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

// DB name must match the running app — see MONGODB_DB_NAME in .env (default: test)
const DB_NAME = (process.env.MONGODB_DB_NAME || 'test').trim();
const BASE_URI =
  (process.env.MONGODB_URI || 'mongodb+srv://Medifollow:Medifollow2025@cluster0.15l0i6q.mongodb.net/').trim();

// Inject DB name into the Atlas URI
const MONGO_URI = BASE_URI.includes('mongodb.net/')
  ? BASE_URI.replace(/(\.mongodb\.net)\/(test|mediflow|[^/?]*)(\?|$)/, `$1/${DB_NAME}$3`)
    .replace(/(\.mongodb\.net)\/?(\?|$)/, `$1/${DB_NAME}$2`)
  : BASE_URI;

// ─── helpers ────────────────────────────────────────────────────────────────

function rand(min: number, max: number, decimals = 0): number {
  const v = Math.random() * (max - min) + min;
  return parseFloat(v.toFixed(decimals));
}

/** Return a Date set to noon on a day offset from today (0 = today, -1 = yesterday …) */
function dayAt(offsetDays: number, hour = 12): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, rand(0, 59), 0, 0);
  return d;
}

// ─── per-day data generators ─────────────────────────────────────────────────

interface VitalEntry {
  patientId: Types.ObjectId;
  recordedBy: Types.ObjectId;
  temperature: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  heartRate: number;
  weight: number;
  oxygenSaturation: number;
  respiratoryRate: number;
  glucoseLevel: number;
  notes: string;
  recordedAt: Date;
}

interface SymptomEntry {
  patientId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  symptoms: string[];
  painLevel: number;
  fatigueLevel: number;
  shortnessOfBreath: boolean;
  nausea: boolean;
  appetiteLoss: number;
  chestPain: number;
  palpitations: boolean;
  breathingDifficulty: number;
  expectoration: boolean;
  nauseaLevel: number;
  vomiting: boolean;
  diarrhea: boolean;
  confusion: boolean;
  description: string;
  reportedAt: Date;
  entrySource: string;
}

/** Day-profiles to create realistic variation across the week.
 *  Indices 0–6 map to offset 0 (today) through offset -6. */
const dayProfiles = [
  // today – slightly elevated temp, mild pain
  {
    temp: () => rand(37.2, 37.8, 1),
    sys: () => rand(120, 135),
    dia: () => rand(75, 85),
    hr: () => rand(72, 88),
    spo2: () => rand(96, 99),
    rr: () => rand(14, 18),
    pain: () => rand(2, 4),
    fatigue: () => rand(2, 4),
    sob: false, nausea: false, chest: 1, breath: 1,
    note: 'Routine morning check',
  },
  // yesterday – normal
  {
    temp: () => rand(36.6, 37.0, 1),
    sys: () => rand(115, 125),
    dia: () => rand(70, 80),
    hr: () => rand(65, 80),
    spo2: () => rand(97, 99),
    rr: () => rand(13, 17),
    pain: () => rand(1, 3),
    fatigue: () => rand(1, 3),
    sob: false, nausea: false, chest: 0, breath: 0,
    note: 'Feeling better',
  },
  // 2 days ago – mild fever (will trigger alert > 38.5)
  {
    temp: () => rand(38.6, 39.1, 1),
    sys: () => rand(130, 148),
    dia: () => rand(82, 92),
    hr: () => rand(95, 108),
    spo2: () => rand(94, 96),
    rr: () => rand(18, 22),
    pain: () => rand(4, 6),
    fatigue: () => rand(5, 7),
    sob: true, nausea: true, chest: 3, breath: 2,
    note: 'Patient reported feeling hot and uncomfortable',
  },
  // 3 days ago – high BP (will trigger alert sys > 160)
  {
    temp: () => rand(37.0, 37.4, 1),
    sys: () => rand(162, 175),
    dia: () => rand(98, 106),
    hr: () => rand(85, 100),
    spo2: () => rand(95, 97),
    rr: () => rand(15, 20),
    pain: () => rand(3, 5),
    fatigue: () => rand(3, 5),
    sob: false, nausea: false, chest: 5, breath: 1,
    note: 'Blood pressure elevated – patient under stress',
  },
  // 4 days ago – near normal recovery
  {
    temp: () => rand(36.8, 37.2, 1),
    sys: () => rand(118, 130),
    dia: () => rand(72, 82),
    hr: () => rand(68, 82),
    spo2: () => rand(96, 99),
    rr: () => rand(13, 17),
    pain: () => rand(2, 4),
    fatigue: () => rand(2, 4),
    sob: false, nausea: false, chest: 1, breath: 1,
    note: 'Recovery progressing well',
  },
  // 5 days ago – low SpO2 (alert < 90 if we go that low, keep borderline)
  {
    temp: () => rand(37.5, 38.0, 1),
    sys: () => rand(125, 140),
    dia: () => rand(78, 88),
    hr: () => rand(88, 102),
    spo2: () => rand(91, 93),
    rr: () => rand(20, 26),
    pain: () => rand(3, 5),
    fatigue: () => rand(5, 8),
    sob: true, nausea: false, chest: 2, breath: 3,
    note: 'SpO2 slightly low, shortness of breath reported',
  },
  // 6 days ago – high HR (alert > 120)
  {
    temp: () => rand(37.1, 37.6, 1),
    sys: () => rand(128, 145),
    dia: () => rand(80, 90),
    hr: () => rand(122, 135),
    spo2: () => rand(95, 98),
    rr: () => rand(17, 22),
    pain: () => rand(4, 7),
    fatigue: () => rand(5, 8),
    sob: false, nausea: true, chest: 4, breath: 2,
    note: 'Elevated heart rate – palpitations reported',
  },
];

function buildVital(
  patientId: Types.ObjectId,
  recordedBy: Types.ObjectId,
  offsetDays: number,
  profile: typeof dayProfiles[0],
): VitalEntry {
  const idx = Math.abs(offsetDays);
  const baseWeight = 70 + (patientId.toString().charCodeAt(0) % 20); // stable per patient
  return {
    patientId,
    recordedBy,
    temperature: profile.temp(),
    bloodPressureSystolic: profile.sys(),
    bloodPressureDiastolic: profile.dia(),
    heartRate: profile.hr(),
    weight: rand(baseWeight - 0.5, baseWeight + 0.5, 1),
    oxygenSaturation: profile.spo2(),
    respiratoryRate: profile.rr(),
    glucoseLevel: rand(0.8, 1.3, 2),
    notes: profile.note,
    recordedAt: dayAt(offsetDays, 8 + (idx % 4)),
  };
}

function buildSymptom(
  patientId: Types.ObjectId,
  reportedBy: Types.ObjectId,
  offsetDays: number,
  profile: typeof dayProfiles[0],
): SymptomEntry {
  const idx = Math.abs(offsetDays);
  const symptoms: string[] = [];
  if (profile.pain() >= 3) symptoms.push('pain');
  if (profile.fatigue() >= 3) symptoms.push('fatigue');
  if (profile.sob) symptoms.push('shortness_of_breath');
  if (profile.nausea) symptoms.push('nausea');
  if (profile.chest >= 3) symptoms.push('chest_pain');
  if (symptoms.length === 0) symptoms.push('none');

  return {
    patientId,
    reportedBy,
    symptoms,
    painLevel: profile.pain(),
    fatigueLevel: profile.fatigue(),
    shortnessOfBreath: profile.sob,
    nausea: profile.nausea,
    appetiteLoss: rand(0, 3),
    chestPain: profile.chest,
    palpitations: profile.hr() > 100,
    breathingDifficulty: profile.breath,
    expectoration: false,
    nauseaLevel: profile.nausea ? rand(1, 4) : 0,
    vomiting: false,
    diarrhea: false,
    confusion: false,
    description: `Auto-seeded entry for day offset ${offsetDays}`,
    reportedAt: dayAt(offsetDays, 9 + (idx % 3)),
    entrySource: 'patient',
  };
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db!;

  const usersCol = db.collection('users');
  const rolesCol = db.collection('roles');
  const vitalsCol = db.collection('vitalparameters');
  const symptomsCol = db.collection('symptoms');

  // Resolve the Patient role _id
  const patientRole = await rolesCol.findOne({ name: { $in: ['Patient', 'patient'] } });
  if (!patientRole) {
    throw new Error('No "Patient" role found. Run seed-roles first.');
  }
  console.log(`Patient role _id: ${patientRole._id}`);

  // Find all patient users
  const patients = await usersCol.find({ role: patientRole._id }).toArray();
  if (patients.length === 0) {
    throw new Error('No patients found in the database. Create patients first.');
  }
  console.log(`Found ${patients.length} patient(s): ${patients.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`);

  // Find a doctor or nurse to use as recordedBy fallback
  const doctorRole = await rolesCol.findOne({ name: { $in: ['Doctor', 'doctor', 'Physician', 'physician'] } });
  const nurseRole  = await rolesCol.findOne({ name: { $in: ['Nurse', 'nurse'] } });

  const roleIds = [doctorRole?._id, nurseRole?._id].filter(Boolean);
  const staffUser = roleIds.length
    ? await usersCol.findOne({ role: { $in: roleIds } })
    : null;

  let vitalsInserted = 0;
  let symptomsInserted = 0;
  let vitalsSkipped = 0;
  let symptomsSkipped = 0;

  for (const patient of patients) {
    const patientId = new Types.ObjectId(patient._id.toString());
    // recordedBy = the patient themselves (or staff if available)
    const recordedBy = patientId;

    console.log(`\nProcessing patient: ${patient.firstName} ${patient.lastName} (${patient._id})`);

    for (let dayOffset = 0; dayOffset >= -6; dayOffset--) {
      const profileIdx = Math.abs(dayOffset);
      const profile = dayProfiles[profileIdx];

      // ── Vitals ──────────────────────────────────────────────────────────────
      const dayStart = new Date(); dayStart.setDate(dayStart.getDate() + dayOffset); dayStart.setHours(0,0,0,0);
      const dayEnd   = new Date(); dayEnd.setDate(dayEnd.getDate()   + dayOffset); dayEnd.setHours(23,59,59,999);

      const existingVital = await vitalsCol.findOne({
        patientId,
        recordedAt: { $gte: dayStart, $lte: dayEnd },
      });

      if (existingVital) {
        console.log(`  Day ${dayOffset}: vital already exists — skipped`);
        vitalsSkipped++;
      } else {
        const vital = buildVital(patientId, recordedBy, dayOffset, profile);
        await vitalsCol.insertOne(vital);
        console.log(`  Day ${dayOffset}: vital inserted (temp=${vital.temperature}, hr=${vital.heartRate}, sys=${vital.bloodPressureSystolic})`);
        vitalsInserted++;
      }

      // ── Symptoms ────────────────────────────────────────────────────────────
      const existingSymptom = await symptomsCol.findOne({
        patientId,
        reportedAt: { $gte: dayStart, $lte: dayEnd },
      });

      if (existingSymptom) {
        console.log(`  Day ${dayOffset}: symptom already exists — skipped`);
        symptomsSkipped++;
      } else {
        const symptom = buildSymptom(patientId, recordedBy, dayOffset, profile);
        await symptomsCol.insertOne(symptom);
        console.log(`  Day ${dayOffset}: symptom inserted (pain=${symptom.painLevel}, fatigue=${symptom.fatigueLevel}, sob=${symptom.shortnessOfBreath})`);
        symptomsInserted++;
      }
    }
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`Vitals   inserted: ${vitalsInserted}  |  skipped: ${vitalsSkipped}`);
  console.log(`Symptoms inserted: ${symptomsInserted}  |  skipped: ${symptomsSkipped}`);
  console.log('Done.');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
