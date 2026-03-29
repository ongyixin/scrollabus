"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { InterestsInput } from "@/components/InterestsInput";
import { InterestsPills } from "@/components/InterestsPills";
import { PersonaSprite } from "@/components/PersonaSprites";
import { PersonaProfileSheet } from "@/components/PersonaProfileSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { PersonaBadge } from "@/components/PersonaBadge";
import { CreatePersonaSheet } from "@/components/CreatePersonaSheet";
import type { Post, Persona } from "@/lib/types";

interface ProfileStats {
  materials: number;
  saves: number;
  likes: number;
}

interface ProfileData {
  id: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  interests: string[];
  enabled_personas: string[];
  enable_av_output: boolean;
  created_at: string;
  email: string;
}

interface MaterialItem {
  id: string;
  title: string;
  created_at: string;
}

interface ProfileClientProps {
  profile: ProfileData;
  stats: ProfileStats;
  materials: MaterialItem[];
}

const AVATAR_GRADIENTS = [
  ["#C9B8E8", "#9B85CE"],
  ["#9DBE8A", "#6A9E58"],
  ["#F5D97A", "#E8C43A"],
  ["#7890C8", "#B0C0E8"],
  ["#F0A09A", "#D4544A"],
];

function getAvatarColors(id: string) {
  const index = (id.charCodeAt(0) + id.charCodeAt(id.length - 1)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index];
}

function getInitials(name: string | null, email: string): string {
  if (name && name.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email[0].toUpperCase();
}

function formatJoinDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function ProfileClient({ profile: initialProfile, stats, materials: initialMaterials }: ProfileClientProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialProfile.display_name ?? "");
  const [bio, setBio] = useState(initialProfile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const DEFAULT_SLUGS = ["lecture-bestie", "exam-gremlin", "problem-grinder", "doodle-prof", "meme-lord", "study-bard"];
  const [personaToggles, setPersonaToggles] = useState<string[]>(
    initialProfile.enabled_personas ?? DEFAULT_SLUGS
  );
  const [personaSaving, setPersonaSaving] = useState(false);
  const [avOutput, setAvOutput] = useState(initialProfile.enable_av_output ?? true);
  const [avSaving, setAvSaving] = useState(false);

  // Telegram study companion
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState<string | null>(null);
  const [telegramDeepLink, setTelegramDeepLink] = useState<string | null>(null);
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramError, setTelegramError] = useState<string | null>(null);
  const [telegramLoaded, setTelegramLoaded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Materials management
  const [materials, setMaterials] = useState<MaterialItem[]>(initialMaterials);
  const [materialCount, setMaterialCount] = useState(stats.materials);
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [selectedMaterials, setSelectedMaterials] = useState<Set<string>>(new Set());
  const [materialsSelectMode, setMaterialsSelectMode] = useState(false);
  const [deletingMaterials, setDeletingMaterials] = useState(false);
  const [materialsDeleteError, setMaterialsDeleteError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // All personas (defaults + custom) — fetched from DB
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
  const [personasLoading, setPersonasLoading] = useState(true);

  // Create / edit persona sheet
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // Delete persona confirmation
  const [deletingPersonaSlug, setDeletingPersonaSlug] = useState<string | null>(null);
  const [personaDeleteError, setPersonaDeleteError] = useState<string | null>(null);
  const [confirmDeletePersonaOpen, setConfirmDeletePersonaOpen] = useState(false);

  // Persona profile sheet
  const [activePersonaSlug, setActivePersonaSlug] = useState<string | null>(null);

  // Liked posts accordion
  const [likedExpanded, setLikedExpanded] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Post[] | null>(null);
  const [likedLoading, setLikedLoading] = useState(false);
  const [likeCount, setLikeCount] = useState(stats.likes);
  const [unlikingIds, setUnlikingIds] = useState<Set<string>>(new Set());


  const [from, to] = getAvatarColors(profile.id);
  const initials = getInitials(profile.display_name, profile.email);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError(null);
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        setProfile((p) => ({ ...p, avatar_url: json.avatar_url }));
      } else {
        setAvatarError(json.error ?? "Upload failed");
      }
    } catch {
      setAvatarError("Upload failed. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openEdit() {
    setDisplayName(profile.display_name ?? "");
    setBio(profile.bio ?? "");
    setSaveError(null);
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: displayName, bio }),
      });
      const json = await res.json();
      if (res.ok) {
        setProfile((p) => ({ ...p, ...json.profile }));
        setEditing(false);
      } else {
        setSaveError(json.error ?? "Failed to save");
      }
    } catch {
      setSaveError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function togglePersona(slug: string) {
    const next = personaToggles.includes(slug)
      ? personaToggles.filter((s) => s !== slug)
      : [...personaToggles, slug];

    // Always keep at least one persona enabled
    if (next.length === 0) return;

    setPersonaToggles(next);
    setPersonaSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_personas: next }),
      });
      setProfile((p) => ({ ...p, enabled_personas: next }));
    } catch {
      setPersonaToggles(personaToggles); // revert
    } finally {
      setPersonaSaving(false);
    }
  }

  async function toggleAvOutput() {
    const next = !avOutput;
    setAvOutput(next);
    setAvSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable_av_output: next }),
      });
      setProfile((p) => ({ ...p, enable_av_output: next }));
    } catch {
      setAvOutput(avOutput); // revert
    } finally {
      setAvSaving(false);
    }
  }

  // Load Telegram connection status on mount
  useEffect(() => {
    fetch("/api/telegram/connect")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setTelegramEnabled(data.telegram_enabled ?? false);
          setTelegramLinked(data.telegram_linked ?? false);
          setTelegramUsername(data.telegram_username ?? null);
          setTelegramDeepLink(data.deep_link ?? null);
        }
        setTelegramLoaded(true);
      })
      .catch(() => setTelegramLoaded(true));
  }, []);

  // Load all personas from DB
  useEffect(() => {
    setPersonasLoading(true);
    fetch("/api/personas")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.personas) {
          setAllPersonas(data.personas);
        }
      })
      .catch(() => {})
      .finally(() => setPersonasLoading(false));
  }, []);

  async function saveTelegramSettings(nextEnabled: boolean) {
    setTelegramSaving(true);
    setTelegramError(null);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const json = await res.json();
      if (res.ok) {
        setTelegramEnabled(json.telegram_enabled ?? false);
        setTelegramLinked(json.telegram_linked ?? false);
      } else {
        setTelegramError(json.error ?? "Failed to save");
        setTelegramEnabled(!nextEnabled);
      }
    } catch {
      setTelegramError("Something went wrong. Please try again.");
      setTelegramEnabled(!nextEnabled);
    } finally {
      setTelegramSaving(false);
    }
  }

  async function unlinkTelegram() {
    setTelegramSaving(true);
    setTelegramError(null);
    try {
      const res = await fetch("/api/telegram/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unlink: true }),
      });
      const json = await res.json();
      if (res.ok) {
        setTelegramEnabled(false);
        setTelegramLinked(false);
        setTelegramUsername(null);
        // Refetch to get a new deep link
        const connectRes = await fetch("/api/telegram/connect");
        if (connectRes.ok) {
          const connectData = await connectRes.json();
          setTelegramDeepLink(connectData.deep_link ?? null);
        }
      } else {
        setTelegramError(json.error ?? "Failed to unlink");
      }
    } catch {
      setTelegramError("Something went wrong. Please try again.");
    } finally {
      setTelegramSaving(false);
    }
  }

  async function deleteCustomPersona() {
    if (!deletingPersonaSlug) return;
    try {
      const res = await fetch(`/api/personas/${deletingPersonaSlug}`, { method: "DELETE" });
      if (res.ok) {
        setAllPersonas((prev) => prev.filter((p) => p.slug !== deletingPersonaSlug));
        setPersonaToggles((prev) => prev.filter((s) => s !== deletingPersonaSlug));
      } else {
        const json = await res.json().catch(() => ({}));
        setPersonaDeleteError(json.error ?? "Failed to delete persona.");
      }
    } catch {
      setPersonaDeleteError("Something went wrong. Please try again.");
    } finally {
      setDeletingPersonaSlug(null);
      setConfirmDeletePersonaOpen(false);
    }
  }

  async function expandLiked() {
    const next = !likedExpanded;
    setLikedExpanded(next);
    if (next && likedPosts === null) {
      setLikedLoading(true);
      try {
        const res = await fetch("/api/likes/posts");
        if (res.ok) {
          const json = await res.json();
          setLikedPosts(json.posts ?? []);
        }
      } finally {
        setLikedLoading(false);
      }
    }
  }

  async function unlikePost(postId: string) {
    setUnlikingIds((prev) => new Set(prev).add(postId));
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      if (res.ok) {
        setLikedPosts((prev) => (prev ?? []).filter((p) => p.id !== postId));
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    } finally {
      setUnlikingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  }

  function toggleMaterialSelection(id: string) {
    setSelectedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllMaterials() {
    if (selectedMaterials.size === materials.length) {
      setSelectedMaterials(new Set());
    } else {
      setSelectedMaterials(new Set(materials.map((m) => m.id)));
    }
  }

  function exitMaterialsSelectMode() {
    setMaterialsSelectMode(false);
    setSelectedMaterials(new Set());
    setMaterialsDeleteError(null);
    setConfirmDeleteOpen(false);
  }

  async function deleteSelectedMaterials() {
    if (selectedMaterials.size === 0) return;
    setDeletingMaterials(true);
    setMaterialsDeleteError(null);
    const ids = Array.from(selectedMaterials);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/materials/${id}`, { method: "DELETE" }).then((r) => r.json())
        )
      );
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        setConfirmDeleteOpen(false);
        setMaterialsDeleteError("Some materials could not be deleted.");
      } else {
        setMaterials((prev) => prev.filter((m) => !ids.includes(m.id)));
        setMaterialCount((c) => c - ids.length);
        exitMaterialsSelectMode();
      }
    } catch {
      setConfirmDeleteOpen(false);
      setMaterialsDeleteError("Failed to delete. Please try again.");
    } finally {
      setDeletingMaterials(false);
    }
  }

  return (
    <div className="min-h-dvh bg-cream pb-32">
      {/* Profile header card */}
      <div className="bg-warm-100 border-b border-warm-200">
        {/* Top bar */}
        <div className="px-5 pt-14 pb-3">
          <h1 className="font-display font-bold text-xl text-charcoal">Profile</h1>
        </div>

        {/* Avatar + identity */}
        <div className="px-5 pb-4 flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative w-[76px] h-[76px] rounded-full overflow-hidden ring-2 ring-white shadow-card group focus:outline-none focus-visible:ring-lavender"
              aria-label="Change profile photo"
            >
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                >
                  <span className="font-display font-bold text-2xl text-white select-none">
                    {initials}
                  </span>
                </div>
              )}

              {/* Camera overlay */}
              {!avatarUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M20 5h-3.17L15 3H9L7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-8 13a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
                  </svg>
                </div>
              )}

              {avatarUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Name / email / bio */}
          <div className="flex-1 min-w-0 pt-1">
            <p className="font-display font-bold text-xl text-charcoal leading-tight">
              {profile.display_name ?? "Anonymous"}
            </p>
            <p className="font-mono text-[11px] text-charcoal/40 mt-0.5 truncate">{profile.email}</p>
            {profile.bio ? (
              <p className="font-sans text-sm text-charcoal/70 mt-2 leading-snug line-clamp-3 italic">
                {profile.bio}
              </p>
            ) : (
              <p className="font-sans text-sm text-charcoal/30 mt-2 italic">No bio yet…</p>
            )}
          </div>
        </div>

        {avatarError && (
          <p className="px-5 pb-3 text-xs font-sans text-cherry">{avatarError}</p>
        )}

        {/* Stats grid */}
        <div className="px-5 pb-5 grid grid-cols-2 gap-2">
          <div className="bg-white/70 rounded-2xl px-2 py-3 text-center shadow-soft">
            <p className="font-display font-bold text-2xl text-charcoal leading-none">
              {materialCount}
            </p>
            <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-wide mt-1.5">
              Materials
            </p>
          </div>
          <a
            href="/saved"
            className="bg-white/70 rounded-2xl px-2 py-3 text-center shadow-soft block hover:bg-white/90 transition-colors active:scale-[0.97]"
          >
            <p className="font-display font-bold text-2xl text-charcoal leading-none">
              {stats.saves}
            </p>
            <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-wide mt-1.5">
              Saves
            </p>
          </a>
          <div className="bg-white/70 rounded-2xl px-2 py-3 text-center shadow-soft">
            <p className="font-display font-bold text-2xl text-charcoal leading-none">
              {stats.likes}
            </p>
            <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-wide mt-1.5">
              Likes
            </p>
          </div>
          <div className="bg-white/70 rounded-2xl px-2 py-3 text-center shadow-soft">
            <p className="font-display font-bold text-sm text-charcoal leading-none mt-1">
              {formatJoinDate(profile.created_at)}
            </p>
            <p className="font-mono text-[10px] text-charcoal/50 uppercase tracking-wide mt-1.5">
              Joined
            </p>
          </div>
        </div>

        {/* Edit profile button */}
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={openEdit}
            className="w-full border border-warm-300 bg-white/60 rounded-2xl py-2.5 font-sans font-semibold text-sm text-charcoal hover:bg-white transition-colors active:scale-95"
          >
            Edit profile
          </button>
        </div>
      </div>

      {/* Interests section */}
      <div className="px-5 py-5 border-b border-warm-200">
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Interests</p>
          <button
            type="button"
            onClick={openEdit}
            className="font-sans text-xs text-lavender-deep font-semibold hover:text-lavender-deep/70 transition-colors"
          >
            Edit
          </button>
        </div>
        {profile.interests.length > 0 ? (
          <InterestsPills interests={profile.interests} size="md" />
        ) : (
          <button
            type="button"
            onClick={openEdit}
            className="flex items-center gap-2 text-sm font-sans text-charcoal/40 hover:text-charcoal/60 transition-colors"
          >
            <span className="w-6 h-6 rounded-full border-2 border-dashed border-charcoal/20 flex items-center justify-center">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
            Add interests to personalise your feed
          </button>
        )}
      </div>

      {/* Liked Posts section */}
      {likeCount > 0 && (
        <div className="border-b border-warm-200">
          <button
            type="button"
            onClick={expandLiked}
            className="w-full px-5 py-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Liked Posts</p>
              <span className="font-mono text-[10px] text-charcoal/30 bg-warm-200 rounded-full px-1.5 py-0.5">
                {likeCount}
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-charcoal/40 transition-transform duration-200 ${likedExpanded ? "rotate-180" : ""}`}
            >
              <path d="M2 5l5 5 5-5" />
            </svg>
          </button>

          <AnimatePresence initial={false}>
            {likedExpanded && (
              <motion.div
                key="liked-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5">
                  {likedLoading ? (
                    <div className="flex justify-center py-6">
                      <span className="w-5 h-5 rounded-full border-2 border-charcoal/20 border-t-charcoal/60 animate-spin" />
                    </div>
                  ) : (likedPosts ?? []).length === 0 ? (
                    <p className="text-sm font-sans text-charcoal/40 text-center py-4">No liked posts yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {(likedPosts ?? []).slice(0, 10).map((p) => (
                        <div key={p.id} className="bg-white rounded-2xl px-4 py-3 border border-warm-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              {p.persona && <PersonaBadge persona={p.persona} size="sm" />}
                              {p.title && (
                                <p className="font-sans font-semibold text-sm text-charcoal mt-1.5 leading-snug">{p.title}</p>
                              )}
                              <p className="font-sans text-xs text-charcoal/60 mt-1 line-clamp-2">{p.body}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => unlikePost(p.id)}
                              disabled={unlikingIds.has(p.id)}
                              aria-label="Unlike post"
                              className="shrink-0 mt-0.5 text-rose-400 hover:text-charcoal/30 transition-colors disabled:opacity-40"
                            >
                              {unlikingIds.has(p.id) ? (
                                <span className="w-4 h-4 rounded-full border-2 border-rose-300 border-t-transparent animate-spin block" />
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                      {(likedPosts ?? []).length > 10 && (
                        <p className="text-xs font-sans text-charcoal/40 text-center pt-1">
                          +{(likedPosts ?? []).length - 10} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Saved Posts — navigate to /saved */}
      <a
        href="/saved"
        className="flex items-center justify-between px-5 py-5 border-b border-warm-200 group hover:bg-warm-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-lavender/20 flex items-center justify-center shrink-0">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="text-lavender-deep">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div>
            <p className="font-sans font-semibold text-sm text-charcoal">Saved Posts</p>
            <p className="font-sans text-xs text-charcoal/40 mt-0.5">
              {stats.saves} {stats.saves === 1 ? "post" : "posts"} across your categories
            </p>
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-charcoal/30 group-hover:text-charcoal/60 transition-colors shrink-0"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </a>

      {/* My Materials section */}
      {materials.length > 0 && (
        <div className="border-b border-warm-200">
          {/* Collapsible header */}
          <button
            type="button"
            onClick={() => {
              if (materialsExpanded) {
                exitMaterialsSelectMode();
              }
              setMaterialsExpanded((v) => !v);
            }}
            className="w-full px-5 py-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">My Materials</p>
              <span className="font-mono text-[10px] text-charcoal/30 bg-warm-200 rounded-full px-1.5 py-0.5">
                {materialCount}
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-charcoal/40 transition-transform duration-200 ${materialsExpanded ? "rotate-180" : ""}`}
            >
              <path d="M2 5l5 5 5-5" />
            </svg>
          </button>

          {/* Collapsible body */}
          <AnimatePresence initial={false}>
            {materialsExpanded && (
              <motion.div
                key="materials-body"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-sans text-xs text-charcoal/40">
                      Delete materials and all their generated content.
                    </p>
                    <button
                      type="button"
                      onClick={() => materialsSelectMode ? exitMaterialsSelectMode() : setMaterialsSelectMode(true)}
                      className="font-sans text-xs font-semibold text-lavender-deep hover:text-lavender-deep/70 transition-colors shrink-0 ml-3"
                    >
                      {materialsSelectMode ? "Cancel" : "Select"}
                    </button>
                  </div>

                  {materialsSelectMode && (
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={toggleAllMaterials}
                        className="font-sans text-xs font-semibold text-charcoal/60 hover:text-charcoal transition-colors"
                      >
                        {selectedMaterials.size === materials.length ? "Deselect all" : "Select all"}
                      </button>
                      {selectedMaterials.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteOpen(true)}
                          className="flex items-center gap-1.5 font-sans text-xs font-semibold text-cherry hover:text-cherry/70 transition-colors"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                          Delete {selectedMaterials.size} {selectedMaterials.size === 1 ? "material" : "materials"}
                        </button>
                      )}
                    </div>
                  )}

                  {materialsDeleteError && (
                    <p className="font-sans text-xs text-cherry mb-3">{materialsDeleteError}</p>
                  )}

                  <div className="space-y-2">
                    {materials.map((m) => {
                      const isSelected = selectedMaterials.has(m.id);
                      return (
                        <div
                          key={m.id}
                          onClick={() => materialsSelectMode && toggleMaterialSelection(m.id)}
                          className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                            materialsSelectMode ? "cursor-pointer" : ""
                          } ${
                            isSelected
                              ? "bg-cherry/5 border-cherry/30"
                              : "bg-white border-warm-200"
                          }`}
                        >
                          {materialsSelectMode && (
                            <div
                              className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                                isSelected ? "bg-cherry border-cherry" : "border-warm-300 bg-white"
                              }`}
                            >
                              {isSelected && (
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M2 5l2.5 2.5L8 2.5" />
                                </svg>
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-sans text-sm font-medium text-charcoal leading-snug truncate">
                              {m.title}
                            </p>
                            <p className="font-mono text-[10px] text-charcoal/40 mt-0.5">
                              {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Study Personas section */}
      <div className="px-5 py-5 border-b border-warm-200">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Study Personas</p>
          {personaSaving && (
            <div className="w-3.5 h-3.5 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <p className="font-sans text-xs text-charcoal/40 mb-4">
          Choose which personas generate content from your materials.
        </p>

        {personasLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-lavender/40 border-t-lavender rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {allPersonas.map((p) => {
              const enabled = personaToggles.includes(p.slug);
              const isLastEnabled = enabled && personaToggles.length === 1;
              const isOwned = p.created_by === profile.id;
              return (
                <div key={p.slug} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="shrink-0 w-9 h-9 flex items-center justify-center">
                      <PersonaSprite
                        slug={p.slug}
                        size={36}
                        emoji={p.emoji}
                        accentColor={p.accent_color}
                      />
                    </div>
                    <div className="flex items-center gap-1 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setActivePersonaSlug(p.slug)}
                        className="font-sans text-sm font-semibold text-charcoal leading-tight hover:text-lavender-deep transition-colors text-left truncate"
                      >
                        {p.name}
                      </button>
                      {isOwned && (
                        <div className="flex items-center gap-1 shrink-0 ml-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPersona(p);
                              setCreateSheetOpen(true);
                            }}
                            className="text-charcoal/35 hover:text-charcoal/60 transition-colors p-0.5 rounded"
                            aria-label={`Edit ${p.name}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingPersonaSlug(p.slug);
                              setConfirmDeletePersonaOpen(true);
                            }}
                            className="text-charcoal/35 hover:text-cherry transition-colors p-0.5 rounded"
                            aria-label={`Delete ${p.name}`}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                              <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={isLastEnabled}
                    onClick={() => togglePersona(p.slug)}
                    className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender disabled:opacity-40 shrink-0 ${
                      enabled ? "bg-charcoal" : "bg-warm-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {personaDeleteError && (
          <p className="font-sans text-xs text-cherry mt-3">{personaDeleteError}</p>
        )}

        {/* Create persona button */}
        <button
          type="button"
          onClick={() => {
            setEditingPersona(null);
            setCreateSheetOpen(true);
          }}
          className="mt-4 w-full relative flex items-center justify-center gap-2.5 rounded-2xl py-3.5 font-sans text-sm font-bold text-white overflow-hidden group active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #a78bfa 0%, #818cf8 40%, #c084fc 100%)",
            boxShadow: "0 4px 16px rgba(139, 92, 246, 0.35)",
          }}
        >
          {/* shimmer sweep */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* sparkle left */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="opacity-90 group-hover:rotate-12 transition-transform duration-300">
            <path d="M12 2l1.8 5.4L19.2 6l-4.2 3.6L17.1 15 12 11.8 6.9 15l2.1-5.4L4.8 6l5.4 1.4z" />
          </svg>

          Create a persona

          {/* sparkle right */}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-70 group-hover:-rotate-12 transition-transform duration-300">
            <path d="M12 2l1.8 5.4L19.2 6l-4.2 3.6L17.1 15 12 11.8 6.9 15l2.1-5.4L4.8 6l5.4 1.4z" />
          </svg>
        </button>
      </div>

      {/* Output formats section */}
      <div className="px-5 py-5 border-b border-warm-200">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Output Formats</p>
          {avSaving && (
            <div className="w-3.5 h-3.5 border-2 border-lavender border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <p className="font-sans text-xs text-charcoal/40 mb-4">
          Disable to generate text and image posts only — faster processing.
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-warm-200 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 13 L2 5 L9 9 Z" fill="currentColor" className="text-charcoal/60" />
                <rect x="10" y="4" width="2.5" height="10" rx="1" fill="currentColor" className="text-charcoal/60" />
                <rect x="14" y="4" width="2.5" height="10" rx="1" fill="currentColor" className="text-charcoal/60" />
              </svg>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-charcoal leading-tight">Audio &amp; Video</p>
              <p className="font-sans text-xs text-charcoal/40 mt-0.5">Songs, TTS narration, clips</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={avOutput}
            onClick={toggleAvOutput}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender ${
              avOutput ? "bg-charcoal" : "bg-warm-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                avOutput ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Study Companion (Telegram) section */}
      <div className="px-5 py-5 border-b border-warm-200">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Study Companion</p>
          {telegramSaving && (
            <div className="w-3.5 h-3.5 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <p className="font-sans text-xs text-charcoal/40 mb-4">
          Get daily study nudges, quiz reminders, and on-demand help via Telegram.
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#229ED9]/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#229ED9]">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-charcoal leading-tight">Telegram</p>
              <p className="font-sans text-xs text-charcoal/40 mt-0.5">
                {telegramLinked
                  ? telegramEnabled
                    ? `Active${telegramUsername ? ` — @${telegramUsername}` : ""}`
                    : "Linked — nudges paused"
                  : "Not connected"}
              </p>
            </div>
          </div>
          {telegramLinked && (
            <button
              type="button"
              role="switch"
              aria-checked={telegramEnabled}
              disabled={telegramSaving || !telegramLoaded}
              onClick={() => {
                const next = !telegramEnabled;
                setTelegramEnabled(next);
                saveTelegramSettings(next);
              }}
              className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#229ED9] disabled:opacity-40 ${
                telegramEnabled ? "bg-[#229ED9]" : "bg-warm-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                  telegramEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          )}
        </div>

        {!telegramLinked && telegramDeepLink && (
          <a
            href={telegramDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#229ED9] text-white font-sans text-sm font-semibold rounded-2xl hover:bg-[#1d8abf] transition-colors active:scale-95"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Connect Telegram Bot
          </a>
        )}

        {!telegramLinked && !telegramDeepLink && telegramLoaded && (
          <p className="font-sans text-xs text-charcoal/40">
            Telegram bot is not configured yet. Ask your admin to set TELEGRAM_BOT_TOKEN.
          </p>
        )}

        {telegramLinked && (
          <div className="space-y-3">
            {telegramEnabled && (
              <div className="bg-[#229ED9]/8 rounded-2xl px-4 py-3">
                <p className="font-sans text-xs text-[#229ED9] font-semibold">Study companion active</p>
                <p className="font-sans text-xs text-charcoal/50 mt-0.5">
                  Send &quot;quiz me&quot;, &quot;explain simpler&quot;, or &quot;recap&quot; to the bot anytime.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={unlinkTelegram}
              disabled={telegramSaving}
              className="w-full text-xs font-sans text-charcoal/40 hover:text-cherry transition-colors py-1"
            >
              Disconnect Telegram
            </button>
          </div>
        )}

        {telegramError && (
          <p className="font-sans text-xs text-cherry mt-2">{telegramError}</p>
        )}
      </div>

      {/* Account section */}
      <div className="px-5 py-5">
        <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide mb-3">Account</p>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="w-full border border-cherry/30 bg-cherry/5 rounded-2xl py-3 font-sans font-semibold text-sm text-cherry hover:bg-cherry/10 transition-colors active:scale-95 disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {/* Delete materials confirmation */}
      <ConfirmSheet
        open={confirmDeleteOpen}
        title={`Delete ${selectedMaterials.size} ${selectedMaterials.size === 1 ? "material" : "materials"}?`}
        description="This will permanently delete the selected materials and all their generated posts. This cannot be undone."
        confirmLabel={`Delete ${selectedMaterials.size === 1 ? "material" : "materials"}`}
        onConfirm={deleteSelectedMaterials}
        onCancel={() => setConfirmDeleteOpen(false)}
        loading={deletingMaterials}
      />

      {/* Edit bottom sheet */}
      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setEditing(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-cream rounded-t-[2rem] shadow-card-hover max-h-[90dvh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-cream pt-4 pb-2 px-5 border-b border-warm-100">
                <div className="w-10 h-1 bg-warm-300 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-xl text-charcoal">Edit profile</h2>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal/50 hover:bg-warm-200 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                      <path d="M1 1l12 12M13 1L1 13" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-5 py-5 space-y-5">
                {/* Display name */}
                <div>
                  <label
                    htmlFor="display-name"
                    className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide"
                  >
                    Display name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-base font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label
                    htmlFor="bio"
                    className="block text-xs font-sans font-semibold text-charcoal/50 mb-1.5 uppercase tracking-wide"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people a little about yourself…"
                    rows={3}
                    maxLength={160}
                    className="w-full bg-warm-50 rounded-xl px-4 py-3 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-lavender/60 border border-warm-200 resize-none"
                  />
                  <p className="text-[11px] font-sans text-charcoal/35 text-right mt-1">
                    {bio.length}/160
                  </p>
                </div>

                {/* Interests */}
                <div>
                  <p className="text-xs font-sans font-semibold text-charcoal/50 mb-3 uppercase tracking-wide">
                    Interests
                  </p>
                  <InterestsInput
                    initialInterests={profile.interests}
                    onSaved={(interests) =>
                      setProfile((p) => ({ ...p, interests }))
                    }
                  />
                </div>

                {saveError && (
                  <p className="text-sm font-sans text-cherry">{saveError}</p>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-charcoal text-cream font-sans font-semibold py-3.5 rounded-2xl hover:bg-warm-black transition-colors disabled:opacity-40 active:scale-95"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>

                {/* Safe-area spacer */}
                <div className="h-[env(safe-area-inset-bottom)]" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Persona profile sheet */}
      <PersonaProfileSheet
        slug={activePersonaSlug}
        onClose={() => setActivePersonaSlug(null)}
      />

      {/* Create / edit persona sheet */}
      <CreatePersonaSheet
        open={createSheetOpen}
        onClose={() => {
          setCreateSheetOpen(false);
          setEditingPersona(null);
        }}
        editingPersona={editingPersona}
        onCreated={(persona) => {
          if (editingPersona) {
            setAllPersonas((prev) =>
              prev.map((p) => (p.slug === persona.slug ? persona : p))
            );
          } else {
            setAllPersonas((prev) => [...prev, persona]);
            setPersonaToggles((prev) => [...prev, persona.slug]);
            // Persist the newly enabled custom persona
            fetch("/api/profile", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ enabled_personas: [...personaToggles, persona.slug] }),
            }).catch(() => {});
          }
        }}
      />

      {/* Delete persona confirmation */}
      <ConfirmSheet
        open={confirmDeletePersonaOpen}
        title="Delete persona?"
        description="This will permanently delete your custom persona. Any existing posts generated by this persona will remain. This cannot be undone."
        confirmLabel="Delete persona"
        onConfirm={deleteCustomPersona}
        onCancel={() => {
          setConfirmDeletePersonaOpen(false);
          setDeletingPersonaSlug(null);
          setPersonaDeleteError(null);
        }}
        loading={false}
      />
    </div>
  );
}
