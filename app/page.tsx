import { getCurrentUser } from "@/lib/auth/current-user";
import HomeClient from "./home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  return <HomeClient userEmail={user?.email ?? null} />;
}
