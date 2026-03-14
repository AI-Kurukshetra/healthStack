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
  const { encounterId } = await params;
  const { error: errorCode } = await searchParams;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Authentication required</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Please sign in to open the encounter video session.
        </CardContent>
      </Card>
    );
  }

  const role = getUserRole(authData.user);

  if (role !== "provider" && role !== "patient") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This video session is available only to assigned provider/patient
          participants.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Consultation Session</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Encounter <span className="font-mono">{encounterId}</span> video room
          initialized. Media integration can be plugged into this page boundary.
        </CardContent>
      </Card>

      {errorCode ? (
        <Card>
          <CardHeader>
            <CardTitle>Session Recovery Guidance</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Session failed with code <span className="font-mono">{errorCode}</span>
            . Retry join, refresh your network, or return to appointments and
            reopen the link.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
