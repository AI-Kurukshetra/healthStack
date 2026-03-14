import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Consultation | Health Stack",
};

type EncounterVideoPageProps = {
  params: Promise<{ encounterId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EncounterVideoPage({
  params,
  searchParams,
}: EncounterVideoPageProps) {
  await params;
  const { error: errorCode } = await searchParams;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Authentication required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Please sign in to open the encounter video session.
        </CardContent>
      </Card>
    );
  }

  const role = getUserRole(authData.user);

  if (role !== "provider" && role !== "patient") {
    return (
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-cyan-950">Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          This video session is available only to assigned provider/patient
          participants.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
            Encounter Session
          </p>
          <CardTitle className="text-cyan-950">Consultation Session</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-700">
          Secure video room initialized. Media integration can be plugged into this
          page boundary.
        </CardContent>
      </Card>

      {errorCode ? (
        <Card className="border-slate-900/10 bg-white/75 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-cyan-950">Session Recovery Guidance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            Session failed with code <span className="font-mono">{errorCode}</span>
            . Retry join, refresh your network, or return to appointments and
            reopen the link.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
