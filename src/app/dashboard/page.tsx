import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "./data";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard · Runway" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already guards this route.
  if (!user) redirect("/login");

  const data = await getDashboardData(supabase, user.id);

  return <DashboardClient email={user.email ?? ""} {...data} />;
}
