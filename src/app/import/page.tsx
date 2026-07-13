import { createClient } from "@/lib/supabase/server";
import { ImportClient } from "./ImportClient";

export const metadata = {
  title: "Import transactions · Runway",
};

export default async function ImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: imports } = user
    ? await supabase
        .from("imports")
        .select("id, filename, row_count, status, created_at")
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <ImportClient
      recentImports={(imports ?? []).map((r) => ({
        id: r.id,
        filename: r.filename,
        rowCount: r.row_count,
        status: r.status,
        createdAt: r.created_at,
      }))}
    />
  );
}
