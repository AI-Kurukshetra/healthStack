import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const DEFAULT_PROVIDER_COUNT = 4;
const DEFAULT_PATIENT_COUNT = 18;
const DEFAULT_SLOTS_PER_PROVIDER = 12;
const DEFAULT_APPOINTMENT_COUNT = 24;
const DEFAULT_ENCOUNTER_COUNT = 16;
const DEFAULT_NOTE_COUNT = 10;
const DEFAULT_AUDIT_LOG_COUNT = 40;

const readIntEnv = (name, fallback) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(parsed, 0);
};

const providerCount = readIntEnv("SEED_PROVIDER_COUNT", DEFAULT_PROVIDER_COUNT);
const patientCount = readIntEnv("SEED_PATIENT_COUNT", DEFAULT_PATIENT_COUNT);
const slotsPerProvider = readIntEnv("SEED_SLOTS_PER_PROVIDER", DEFAULT_SLOTS_PER_PROVIDER);
const appointmentCount = readIntEnv("SEED_APPOINTMENT_COUNT", DEFAULT_APPOINTMENT_COUNT);
const encounterCount = readIntEnv("SEED_ENCOUNTER_COUNT", DEFAULT_ENCOUNTER_COUNT);
const noteCount = readIntEnv("SEED_NOTE_COUNT", DEFAULT_NOTE_COUNT);
const auditLogCount = readIntEnv("SEED_AUDIT_LOG_COUNT", DEFAULT_AUDIT_LOG_COUNT);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createUser = async (role) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = `seed-${role}-${Date.now()}-${faker.string.alphanumeric(8).toLowerCase()}@example.com`;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: "SeedPassword123!",
    email_confirm: true,
    user_metadata: {
      role,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
    },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create ${role} user: ${error?.message ?? "Unknown error"}`);
  }

  return { id: data.user.id, email, firstName, lastName };
};

const buildSlotsForProvider = (providerId, count) => {
  const slots = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = Math.max(count * 20, 200);

  while (slots.length < count && attempts < maxAttempts) {
    attempts += 1;
    const dayOffset = faker.number.int({ min: -7, max: 14 });
    const hour = faker.helpers.arrayElement([9, 10, 11, 13, 14, 15, 16]);
    const minute = faker.helpers.arrayElement([0, 30]);

    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset);
    startsAt.setUTCHours(hour, minute, 0, 0);

    const endsAt = new Date(startsAt);
    endsAt.setUTCMinutes(endsAt.getUTCMinutes() + 30);
    const slotKey = `${providerId}:${startsAt.toISOString()}:${endsAt.toISOString()}`;

    if (seen.has(slotKey)) {
      continue;
    }
    seen.add(slotKey);

    slots.push({
      provider_id: providerId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      is_available: true,
    });
  }

  if (slots.length < count) {
    throw new Error(
      `Unable to generate enough unique slots for provider ${providerId}. Requested=${count}, generated=${slots.length}`,
    );
  }

  return slots;
};

const appointmentStatus = () => faker.helpers.arrayElement(["confirmed", "confirmed", "confirmed", "cancelled"]);

const encounterStatus = () => faker.helpers.arrayElement(["active", "connected", "completed"]);

const noteType = () => faker.helpers.arrayElement(["soap", "progress"]);

const main = async () => {
  console.log("Starting seed...");

  const providers = [];
  for (let i = 0; i < providerCount; i += 1) {
    providers.push(await createUser("provider"));
  }

  const patientUsers = [];
  for (let i = 0; i < patientCount; i += 1) {
    patientUsers.push(await createUser("patient"));
  }

  const patientRows = patientUsers.map((user) => ({
    user_id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    date_of_birth: faker.date.birthdate({ min: 18, max: 85, mode: "age" }).toISOString().slice(0, 10),
  }));

  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .insert(patientRows)
    .select("id,user_id,first_name,last_name");

  if (patientsError || !patients) {
    throw new Error(`Failed to insert patients: ${patientsError?.message ?? "Unknown error"}`);
  }

  const allSlots = providers.flatMap((provider) => buildSlotsForProvider(provider.id, slotsPerProvider));

  const { data: slots, error: slotsError } = await supabase
    .from("provider_availability_slots")
    .insert(allSlots)
    .select("id,provider_id,starts_at,ends_at");

  if (slotsError || !slots) {
    throw new Error(`Failed to insert provider slots: ${slotsError?.message ?? "Unknown error"}`);
  }

  const slotsToBook = faker.helpers.shuffle(slots).slice(0, Math.min(appointmentCount, slots.length));
  const appointmentsInput = slotsToBook.map((slot) => {
    const patient = faker.helpers.arrayElement(patients);
    return {
      patient_id: patient.id,
      provider_id: slot.provider_id,
      slot_id: slot.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      status: appointmentStatus(),
    };
  });

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .insert(appointmentsInput)
    .select("id,patient_id,provider_id,starts_at,status");

  if (appointmentsError || !appointments) {
    throw new Error(`Failed to insert appointments: ${appointmentsError?.message ?? "Unknown error"}`);
  }

  const confirmedAppointments = appointments.filter((appointment) => appointment.status === "confirmed");
  const encountersInput = faker.helpers
    .shuffle(confirmedAppointments)
    .slice(0, Math.min(encounterCount, confirmedAppointments.length))
    .map((appointment) => {
      const status = encounterStatus();
      const startedAt = new Date(appointment.starts_at);
      const patientJoinedAt =
        status === "connected" || status === "completed"
          ? new Date(startedAt.getTime() + faker.number.int({ min: 2, max: 12 }) * 60 * 1000)
          : null;

      return {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        provider_id: appointment.provider_id,
        status,
        started_at: startedAt.toISOString(),
        patient_joined_at: patientJoinedAt ? patientJoinedAt.toISOString() : null,
      };
    });

  const { data: encounters, error: encountersError } = await supabase
    .from("encounters")
    .insert(encountersInput)
    .select("id,appointment_id,patient_id,provider_id,status");

  if (encountersError || !encounters) {
    throw new Error(`Failed to insert encounters: ${encountersError?.message ?? "Unknown error"}`);
  }

  const noteCandidates = encounters.filter((encounter) => encounter.status !== "active");
  const notesInput = faker.helpers
    .shuffle(noteCandidates)
    .slice(0, Math.min(noteCount, noteCandidates.length))
    .map((encounter) => ({
      encounter_id: encounter.id,
      patient_id: encounter.patient_id,
      provider_id: encounter.provider_id,
      note_type: noteType(),
      content: faker.lorem.paragraphs({ min: 2, max: 4 }),
      version: 1,
    }));

  if (notesInput.length > 0) {
    const { error: notesError } = await supabase.from("clinical_notes").insert(notesInput);
    if (notesError) {
      throw new Error(`Failed to insert clinical notes: ${notesError.message}`);
    }
  }

  const auditableResources = [...appointments, ...encounters].map((item) => item.id);
  const auditInput = Array.from({ length: Math.max(auditLogCount, 0) }).map(() => {
    const actor = faker.helpers.arrayElement([...providers, ...patientUsers]);
    return {
      event_type: faker.helpers.arrayElement(["auth", "appointment", "medical_record", "encounter"]),
      action: faker.helpers.arrayElement(["create", "update", "read"]),
      resource_type: faker.helpers.arrayElement(["appointment", "encounter", "clinical_note", "auth_session"]),
      resource_id: auditableResources.length > 0 ? faker.helpers.arrayElement(auditableResources) : null,
      actor_id: actor.id,
      actor_role: faker.helpers.arrayElement(["provider", "patient"]),
      request_id: faker.string.uuid(),
      metadata: {
        seeded: true,
        email: actor.email,
      },
    };
  });

  if (auditInput.length > 0) {
    const { error: auditError } = await supabase.from("audit_logs").insert(auditInput);
    if (auditError) {
      throw new Error(`Failed to insert audit logs: ${auditError.message}`);
    }
  }

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        providers: providers.length,
        patients: patients.length,
        slots: slots.length,
        appointments: appointments.length,
        encounters: encounters.length,
        notes: notesInput.length,
        auditLogs: auditInput.length,
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
