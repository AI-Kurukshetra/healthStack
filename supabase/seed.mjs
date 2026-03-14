import { faker } from "@faker-js/faker";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const DEFAULT_PROVIDER_COUNT = 4;
const DEFAULT_PATIENT_COUNT = 18;
const DEFAULT_SLOTS_PER_PROVIDER = 12;
const DEFAULT_APPOINTMENT_COUNT = 24;
const DEFAULT_ENCOUNTER_COUNT = 16;
const DEFAULT_NOTE_COUNT = 10;
const DEFAULT_AUDIT_LOG_COUNT = 40;

const SEED_ORG_SLUG = process.env.SEED_ORG_SLUG ?? "bacancy-health-network";
const SEED_ORG_NAME = process.env.SEED_ORG_NAME ?? "Bacancy Health Network";
const PLATFORM_ADMIN_EMAIL =
  process.env.PLATFORM_ADMIN_EMAIL ?? "rutvik.patel@bacancy.com";
const PLATFORM_ADMIN_PASSWORD = process.env.PLATFORM_ADMIN_PASSWORD;
const PLATFORM_ADMIN_FIRST_NAME = process.env.PLATFORM_ADMIN_FIRST_NAME ?? "Rutvik";
const PLATFORM_ADMIN_LAST_NAME = process.env.PLATFORM_ADMIN_LAST_NAME ?? "Patel";
const shouldClearDatabase = ["1", "true", "yes"].includes(
  String(process.env.SEED_CLEAR_DATABASE ?? "").toLowerCase(),
);

if (!PLATFORM_ADMIN_PASSWORD) {
  throw new Error(
    "Missing env var: PLATFORM_ADMIN_PASSWORD is required to seed platform admin user.",
  );
}

const readIntEnv = (name, fallback) => {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? fallback : Math.max(parsed, 0);
};

const providerCount = readIntEnv("SEED_PROVIDER_COUNT", DEFAULT_PROVIDER_COUNT);
const patientCount = readIntEnv("SEED_PATIENT_COUNT", DEFAULT_PATIENT_COUNT);
const slotsPerProvider = readIntEnv(
  "SEED_SLOTS_PER_PROVIDER",
  DEFAULT_SLOTS_PER_PROVIDER,
);
const appointmentCount = readIntEnv(
  "SEED_APPOINTMENT_COUNT",
  DEFAULT_APPOINTMENT_COUNT,
);
const encounterCount = readIntEnv("SEED_ENCOUNTER_COUNT", DEFAULT_ENCOUNTER_COUNT);
const noteCount = readIntEnv("SEED_NOTE_COUNT", DEFAULT_NOTE_COUNT);
const auditLogCount = readIntEnv("SEED_AUDIT_LOG_COUNT", DEFAULT_AUDIT_LOG_COUNT);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const isMissingTableError = (error) => {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("could not find the table") || message.includes("does not exist");
};

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
    throw new Error(
      `Failed to create ${role} user: ${error?.message ?? "Unknown error"}`,
    );
  }

  return { id: data.user.id, email, firstName, lastName, role };
};

const buildSlotsForProvider = (providerId, count) => {
  const slots = [];
  const seen = new Set();
  let attempts = 0;
  const maxAttempts = Math.max(count * 20, 200);

  while (slots.length < count && attempts < maxAttempts) {
    attempts += 1;
    const dayOffset = faker.number.int({ min: -30, max: 20 });
    const hour = faker.helpers.arrayElement([9, 10, 11, 13, 14, 15, 16]);
    const minute = faker.helpers.arrayElement([0, 30]);

    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + dayOffset);
    startsAt.setUTCHours(hour, minute, 0, 0);

    const endsAt = new Date(startsAt);
    endsAt.setUTCMinutes(endsAt.getUTCMinutes() + 30);
    const slotKey = `${providerId}:${startsAt.toISOString()}:${endsAt.toISOString()}`;

    if (seen.has(slotKey)) continue;
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

const appointmentStatus = () =>
  faker.helpers.arrayElement(["confirmed", "confirmed", "confirmed", "cancelled"]);

const encounterStatus = () =>
  faker.helpers.arrayElement(["active", "connected", "completed"]);

const noteType = () => faker.helpers.arrayElement(["soap", "progress"]);

const tableExists = async (table) => {
  const { error } = await supabase.from(table).select("id", { head: true, count: "exact" });
  return !error;
};

const columnExists = async (table, column) => {
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
};

const ensureSeedOrganization = async () => {
  const { data, error } = await supabase
    .from("organizations")
    .upsert({ slug: SEED_ORG_SLUG, name: SEED_ORG_NAME }, { onConflict: "slug" })
    .select("id")
    .single();

  if (error) {
    const message = String(error.message || "").toLowerCase();
    const missingTable =
      message.includes("could not find the table") ||
      message.includes("does not exist");
    if (missingTable) {
      return { orgId: null, hasOrganizations: false, hasMemberships: false };
    }
    throw new Error(
      `Failed to upsert seed organization: ${error?.message ?? "Unknown error"}`,
    );
  }

  if (!data) {
    throw new Error(`Failed to upsert seed organization: ${error?.message ?? "Unknown error"}`);
  }

  const hasMemberships = await tableExists("organization_memberships");
  return { orgId: data.id, hasOrganizations: true, hasMemberships };
};

const deleteAllRows = async (table, primaryColumn = "id") => {
  const { error } = await supabase.from(table).delete().not(primaryColumn, "is", null);
  if (error && !isMissingTableError(error)) {
    throw new Error(`Failed to clear ${table}: ${error.message}`);
  }
};

const clearDomainData = async () => {
  const deletePlan = [
    { table: "clinical_notes" },
    { table: "encounters" },
    { table: "appointments" },
    { table: "audit_logs" },
    { table: "provider_availability_slots" },
    { table: "patients" },
    { table: "organization_memberships" },
  ];

  for (const step of deletePlan) {
    await deleteAllRows(step.table);
  }

  const { error: orgDeleteError } = await supabase
    .from("organizations")
    .delete()
    .neq("slug", "default-org");
  if (orgDeleteError && !isMissingTableError(orgDeleteError)) {
    throw new Error(`Failed to clear organizations: ${orgDeleteError.message}`);
  }
};

const listAllUsers = async () => {
  const users = [];
  const perPage = 200;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }
    const pageUsers = data?.users ?? [];
    if (pageUsers.length === 0) break;
    users.push(...pageUsers);
    if (pageUsers.length < perPage) break;
    page += 1;
  }

  return users;
};

const clearAuthUsers = async () => {
  const users = await listAllUsers();
  for (const user of users) {
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      throw new Error(`Failed to delete auth user ${user.email ?? user.id}: ${error.message}`);
    }
  }
  return users.length;
};

const findUserByEmail = async (email) => {
  const users = await listAllUsers();
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
};

const ensurePlatformAdmin = async () => {
  const userMetadata = {
    role: "admin",
    first_name: PLATFORM_ADMIN_FIRST_NAME,
    last_name: PLATFORM_ADMIN_LAST_NAME,
    full_name: `${PLATFORM_ADMIN_FIRST_NAME} ${PLATFORM_ADMIN_LAST_NAME}`,
  };

  const existingUser = await findUserByEmail(PLATFORM_ADMIN_EMAIL);

  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email: PLATFORM_ADMIN_EMAIL,
      password: PLATFORM_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (error || !data.user) {
      throw new Error(`Failed to update platform admin user: ${error?.message ?? "Unknown error"}`);
    }

    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: PLATFORM_ADMIN_EMAIL,
    password: PLATFORM_ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error || !data.user) {
    throw new Error(`Failed to create platform admin user: ${error?.message ?? "Unknown error"}`);
  }

  return data.user;
};

const main = async () => {
  console.log("Starting seed...");

  if (shouldClearDatabase) {
    console.log("Clearing existing data...");
    await clearDomainData();
    const deletedUsers = await clearAuthUsers();
    console.log(`Deleted ${deletedUsers} existing auth users.`);
  }

  const platformAdmin = await ensurePlatformAdmin();

  const patientsHasOrgId = await columnExists("patients", "organization_id");
  const slotsHasOrgId = await columnExists("provider_availability_slots", "organization_id");
  const appointmentsHasOrgId = await columnExists("appointments", "organization_id");
  const encountersHasOrgId = await columnExists("encounters", "organization_id");
  const notesHasOrgId = await columnExists("clinical_notes", "organization_id");
  const auditHasOrgId = await columnExists("audit_logs", "organization_id");

  const { orgId, hasOrganizations, hasMemberships } = await ensureSeedOrganization();

  const providers = [];
  for (let i = 0; i < providerCount; i += 1) {
    providers.push(await createUser("provider"));
  }

  const patientUsers = [];
  for (let i = 0; i < patientCount; i += 1) {
    patientUsers.push(await createUser("patient"));
  }

  if (orgId && hasMemberships) {
    const membershipRows = [
      { id: platformAdmin.id, role: "admin" },
      ...providers.map((user) => ({ id: user.id, role: user.role })),
      ...patientUsers.map((user) => ({ id: user.id, role: user.role })),
    ].map((user) => ({
      organization_id: orgId,
      user_id: user.id,
      role: user.role,
    }));

    const { error: membershipError } = await supabase
      .from("organization_memberships")
      .upsert(membershipRows, { onConflict: "organization_id,user_id" });

    if (membershipError) {
      throw new Error(
        `Failed to upsert organization memberships: ${membershipError.message}`,
      );
    }
  }

  const patientRows = patientUsers.map((user) => ({
    ...(patientsHasOrgId && orgId ? { organization_id: orgId } : {}),
    user_id: user.id,
    first_name: user.firstName,
    last_name: user.lastName,
    date_of_birth: faker.date
      .birthdate({ min: 18, max: 85, mode: "age" })
      .toISOString()
      .slice(0, 10),
  }));

  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .insert(patientRows)
    .select("id,user_id,first_name,last_name");

  if (patientsError || !patients) {
    throw new Error(
      `Failed to insert patients: ${patientsError?.message ?? "Unknown error"}`,
    );
  }

  const allSlots = providers.flatMap((provider) =>
    buildSlotsForProvider(provider.id, slotsPerProvider),
  );

  const { data: slots, error: slotsError } = await supabase
    .from("provider_availability_slots")
    .insert(
      allSlots.map((slot) => ({
        ...(slotsHasOrgId && orgId ? { organization_id: orgId } : {}),
        ...slot,
      })),
    )
    .select("id,provider_id,starts_at,ends_at");

  if (slotsError || !slots) {
    throw new Error(
      `Failed to insert provider slots: ${slotsError?.message ?? "Unknown error"}`,
    );
  }

  const now = Date.now();
  const sortedSlots = [...slots].sort(
    (a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at),
  );
  const pastSlots = sortedSlots.filter((slot) => Date.parse(slot.ends_at) < now);
  const remainingSlots = new Map(sortedSlots.map((slot) => [slot.id, slot]));

  const appointmentsInput = [];

  // Ensure patient history: each patient gets one past slot when available.
  for (const patient of patients) {
    if (appointmentsInput.length >= Math.min(appointmentCount, sortedSlots.length)) {
      break;
    }
    const slot = pastSlots.find((candidate) => remainingSlots.has(candidate.id));
    if (!slot) break;

    appointmentsInput.push({
      ...(appointmentsHasOrgId && orgId ? { organization_id: orgId } : {}),
      patient_id: patient.id,
      provider_id: slot.provider_id,
      slot_id: slot.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      status: faker.helpers.arrayElement(["confirmed", "cancelled"]),
    });
    remainingSlots.delete(slot.id);
  }

  const additionalSlots = faker.helpers
    .shuffle(Array.from(remainingSlots.values()))
    .slice(0, Math.max(Math.min(appointmentCount, sortedSlots.length) - appointmentsInput.length, 0));

  for (const slot of additionalSlots) {
    const patient = faker.helpers.arrayElement(patients);
    appointmentsInput.push({
      ...(appointmentsHasOrgId && orgId ? { organization_id: orgId } : {}),
      patient_id: patient.id,
      provider_id: slot.provider_id,
      slot_id: slot.id,
      starts_at: slot.starts_at,
      ends_at: slot.ends_at,
      status: appointmentStatus(),
    });
  }

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .insert(appointmentsInput)
    .select("id,patient_id,provider_id,slot_id,starts_at,status");

  if (appointmentsError || !appointments) {
    throw new Error(
      `Failed to insert appointments: ${appointmentsError?.message ?? "Unknown error"}`,
    );
  }

  const bookedSlotIds = appointments
    .filter((appointment) => appointment.status === "confirmed")
    .map((appointment) => appointment.slot_id);

  if (bookedSlotIds.length > 0) {
    const { error: slotUpdateError } = await supabase
      .from("provider_availability_slots")
      .update({ is_available: false })
      .in("id", bookedSlotIds);

    if (slotUpdateError) {
      throw new Error(`Failed to update slot availability: ${slotUpdateError.message}`);
    }
  }

  const confirmedAppointments = appointments.filter(
    (appointment) => appointment.status === "confirmed",
  );

  const encountersInput = faker.helpers
    .shuffle(confirmedAppointments)
    .slice(0, Math.min(encounterCount, confirmedAppointments.length))
    .map((appointment) => {
      const status = encounterStatus();
      const startedAt = new Date(appointment.starts_at);
      const patientJoinedAt =
        status === "connected" || status === "completed"
          ? new Date(
              startedAt.getTime() +
                faker.number.int({ min: 2, max: 12 }) * 60 * 1000,
            )
          : null;

      return {
        ...(encountersHasOrgId && orgId ? { organization_id: orgId } : {}),
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
    throw new Error(
      `Failed to insert encounters: ${encountersError?.message ?? "Unknown error"}`,
    );
  }

  const noteCandidates = encounters.filter((encounter) => encounter.status !== "active");
  const notesInput = faker.helpers
    .shuffle(noteCandidates)
    .slice(0, Math.min(noteCount, noteCandidates.length))
    .map((encounter) => ({
      ...(notesHasOrgId && orgId ? { organization_id: orgId } : {}),
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
      ...(auditHasOrgId && orgId ? { organization_id: orgId } : {}),
      event_type: faker.helpers.arrayElement([
        "auth",
        "appointment",
        "medical_record",
        "encounter",
      ]),
      action: faker.helpers.arrayElement(["create", "update", "read"]),
      resource_type: faker.helpers.arrayElement([
        "appointment",
        "encounter",
        "clinical_note",
        "auth_session",
      ]),
      resource_id:
        auditableResources.length > 0
          ? faker.helpers.arrayElement(auditableResources)
          : null,
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

  const patientsWithHistory = new Set(
    appointments
      .filter((appointment) => Date.parse(appointment.starts_at) < now)
      .map((appointment) => appointment.patient_id),
  ).size;

  console.log("Seed complete.");
  console.log(
    JSON.stringify(
      {
        clearDatabase: shouldClearDatabase,
        platformAdmin: PLATFORM_ADMIN_EMAIL,
        organization: hasOrganizations ? (orgId ?? "unknown") : "not_available",
        providers: providers.length,
        patients: patients.length,
        slots: slots.length,
        appointments: appointments.length,
        encounters: encounters.length,
        notes: notesInput.length,
        auditLogs: auditInput.length,
        patientsWithHistory,
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
