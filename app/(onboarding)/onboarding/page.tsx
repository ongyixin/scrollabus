import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingFlow from "@/components/OnboardingFlow";

async function completeOnboarding(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName = formData.get("displayName")?.toString().trim();
  const updates: Record<string, unknown> = { onboarding_completed: true };
  if (displayName) updates.display_name = displayName;

  await supabase.from("profiles").update(updates).eq("id", user.id);

  redirect("/feed");
}

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) redirect("/feed");

  return (
    <OnboardingFlow
      displayName={profile?.display_name ?? null}
      completeOnboarding={completeOnboarding}
    />
  );
}
