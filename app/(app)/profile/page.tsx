import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileClient } from "@/components/ProfileClient";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, materialsResult, savesResult, likesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("materials")
      .select("id, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("saves")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  const profile = profileResult.data;
  const materials = (materialsResult.data ?? []) as { id: string; title: string; created_at: string }[];

  return (
    <ProfileClient
      profile={{
        id: user.id,
        display_name: profile?.display_name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bio: (profile as any)?.bio ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        avatar_url: (profile as any)?.avatar_url ?? null,
        interests: profile?.interests ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        enabled_personas: (profile as any)?.enabled_personas ?? ["lecture-bestie", "exam-gremlin", "problem-grinder", "doodle-prof", "meme-lord", "study-bard"],
        enable_av_output: (profile as any)?.enable_av_output ?? true,
        created_at: profile?.created_at ?? user.created_at ?? new Date().toISOString(),
        email: user.email ?? "",
      }}
      materials={materials}
      stats={{
        materials: materials.length,
        saves: savesResult.count ?? 0,
        likes: likesResult.count ?? 0,
      }}
    />
  );
}
