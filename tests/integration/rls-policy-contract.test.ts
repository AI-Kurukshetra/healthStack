import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readMigration(path: string): string {
  return readFileSync(path, "utf-8");
}

describe("RLS policy contracts", () => {
  it("keeps RLS enabled and owner-isolated policies for patients", () => {
    const sql = readMigration("supabase/migrations/20260314124500_patients_profile.sql");

    expect(sql).toContain("alter table public.patients enable row level security");
    expect(sql).toContain("patients_select_own");
    expect(sql).toContain("patients_insert_own");
    expect(sql).toContain("patients_update_own");
    expect(sql).toContain("(select auth.uid()) = user_id");
  });

  it("keeps patient/provider partitioning policies for appointments and encounters", () => {
    const appointmentsSql = readMigration("supabase/migrations/20260314133000_appointments.sql");
    const encountersSql = readMigration("supabase/migrations/20260314134000_encounters.sql");

    expect(appointmentsSql).toContain("alter table public.appointments enable row level security");
    expect(appointmentsSql).toContain("appointments_select_patient");
    expect(appointmentsSql).toContain("appointments_select_provider");
    expect(encountersSql).toContain("alter table public.encounters enable row level security");
    expect(encountersSql).toContain("encounters_select_patient");
    expect(encountersSql).toContain("encounters_select_provider");
  });

  it("keeps clinical note and audit-log RLS boundaries", () => {
    const notesSql = readMigration("supabase/migrations/20260314142000_clinical_notes.sql");
    const auditSql = readMigration("supabase/migrations/20260314145500_audit_logs.sql");

    expect(notesSql).toContain("alter table public.clinical_notes enable row level security");
    expect(notesSql).toContain("clinical_notes_select_provider");
    expect(notesSql).toContain("clinical_notes_select_patient");
    expect(notesSql).toContain("clinical_notes_insert_provider");
    expect(auditSql).toContain("alter table public.audit_logs enable row level security");
    expect(auditSql).toContain("audit_logs_insert_actor_or_anonymous");
    expect(auditSql).toContain("audit_logs_select_actor_or_admin");
  });
});
