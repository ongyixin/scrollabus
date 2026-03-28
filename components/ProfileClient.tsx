"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { InterestsInput } from "@/components/InterestsInput";
import { InterestsPills } from "@/components/InterestsPills";
import { PERSONA_CONFIG } from "@/lib/constants";
import { PersonaSprite } from "@/components/PersonaSprites";
import { PersonaProfileSheet } from "@/components/PersonaProfileSheet";
import { ConfirmSheet } from "@/components/ConfirmSheet";
import { PersonaBadge } from "@/components/PersonaBadge";
import type { Post } from "@/lib/types";

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
  const [personaToggles, setPersonaToggles] = useState<string[]>(
    initialProfile.enabled_personas ?? PERSONA_CONFIG.map((p) => p.slug)
  );
  const [personaSaving, setPersonaSaving] = useState(false);
  const [avOutput, setAvOutput] = useState(initialProfile.enable_av_output ?? true);
  const [avSaving, setAvSaving] = useState(false);

  // Photon study companion
  const [photonEnabled, setPhotonEnabled] = useState(false);
  const [photonPhone, setPhotonPhone] = useState("");
  const [photonSaving, setPhotonSaving] = useState(false);
  const [photonError, setPhotonError] = useState<string | null>(null);
  const [photonLoaded, setPhotonLoaded] = useState(false);

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

  // Persona profile sheet
  const [activePersonaSlug, setActivePersonaSlug] = useState<string | null>(null);

  // Liked posts accordion
  const [likedExpanded, setLikedExpanded] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Post[] | null>(null);
  const [likedLoading, setLikedLoading] = useState(false);


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

  // Load Photon connection status on mount
  useEffect(() => {
    fetch("/api/photon/connect")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setPhotonEnabled(data.photon_enabled ?? false);
          setPhotonPhone(data.phone_number ?? "");
        }
        setPhotonLoaded(true);
      })
      .catch(() => setPhotonLoaded(true));
  }, []);

  async function savePhotonSettings(nextEnabled: boolean, phone: string) {
    setPhotonSaving(true);
    setPhotonError(null);
    try {
      const res = await fetch("/api/photon/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phone, enabled: nextEnabled }),
      });
      const json = await res.json();
      if (res.ok) {
        setPhotonEnabled(json.photon_enabled ?? false);
        setPhotonPhone(json.phone_number ?? "");
      } else {
        setPhotonError(json.error ?? "Failed to save");
        setPhotonEnabled(!nextEnabled); // revert toggle
      }
    } catch {
      setPhotonError("Something went wrong. Please try again.");
      setPhotonEnabled(!nextEnabled);
    } finally {
      setPhotonSaving(false);
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
      {stats.likes > 0 && (
        <div className="border-b border-warm-200">
          <button
            type="button"
            onClick={expandLiked}
            className="w-full px-5 py-5 flex items-center justify-between group"
          >
            <div className="flex items-center gap-2">
              <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Liked Posts</p>
              <span className="font-mono text-[10px] text-charcoal/30 bg-warm-200 rounded-full px-1.5 py-0.5">
                {stats.likes}
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
                          {p.persona && <PersonaBadge persona={p.persona} size="sm" />}
                          {p.title && (
                            <p className="font-sans font-semibold text-sm text-charcoal mt-1.5 leading-snug">{p.title}</p>
                          )}
                          <p className="font-sans text-xs text-charcoal/60 mt-1 line-clamp-2">{p.body}</p>
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
        <div className="space-y-3">
          {PERSONA_CONFIG.map((p) => {
            const enabled = personaToggles.includes(p.slug);
            const isLastEnabled = enabled && personaToggles.length === 1;
            return (
              <div key={p.slug} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="shrink-0 w-9 h-9 flex items-center justify-center">
                    <PersonaSprite slug={p.slug} size={36} />
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActivePersonaSlug(p.slug)}
                      className="font-sans text-sm font-semibold text-charcoal leading-tight hover:text-lavender-deep transition-colors text-left"
                    >
                      {p.name}
                    </button>
                    <span className="group/tooltip relative inline-flex shrink-0">
                      <button
                        type="button"
                        className="rounded-full p-0.5 text-charcoal/35 hover:text-charcoal/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender focus-visible:ring-offset-1"
                        aria-label={`About ${p.name}`}
                        aria-describedby={`persona-tip-${p.slug}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.25" />
                          <path
                            d="M6.3 5.1c0-.45.35-.8.85-.8s.85.35.85.85c0 .55-.25.85-.65 1.15-.45.35-.75.65-.75 1.1V8"
                            stroke="currentColor"
                            strokeWidth="1.1"
                            strokeLinecap="round"
                          />
                          <circle cx="7" cy="9.85" r="0.45" fill="currentColor" />
                        </svg>
                      </button>
                      <span id={`persona-tip-${p.slug}`} className="sr-only">
                        {p.tooltip}
                      </span>
                      <span
                        role="presentation"
                        aria-hidden="true"
                        className="pointer-events-none invisible absolute left-1/2 top-full z-30 mt-1.5 w-[min(18rem,calc(100vw-3rem))] -translate-x-1/2 rounded-xl border border-warm-200 bg-white px-3 py-2.5 text-left font-sans text-sm leading-snug text-charcoal/85 shadow-lg opacity-0 transition-opacity duration-150 group-hover/tooltip:visible group-hover/tooltip:opacity-100 group-focus-within/tooltip:visible group-focus-within/tooltip:opacity-100"
                      >
                        {p.tooltip}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={isLastEnabled}
                  onClick={() => togglePersona(p.slug)}
                  className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-lavender disabled:opacity-40 ${
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

      {/* Study Companion (Photon) section */}
      <div className="px-5 py-5 border-b border-warm-200">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-xs text-charcoal/50 uppercase tracking-wide">Study Companion</p>
          {photonSaving && (
            <div className="w-3.5 h-3.5 border-2 border-cobalt border-t-transparent rounded-full animate-spin" />
          )}
        </div>
        <p className="font-sans text-xs text-charcoal/40 mb-4">
          Get daily study nudges, quiz reminders, and on-demand help over iMessage or SMS.
        </p>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-cobalt/10 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cobalt">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-sans text-sm font-semibold text-charcoal leading-tight">iMessage / SMS</p>
              <p className="font-sans text-xs text-charcoal/40 mt-0.5">
                {photonEnabled ? "Active — nudges enabled" : "Off — tap to enable"}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={photonEnabled}
            disabled={photonSaving || !photonLoaded}
            onClick={() => {
              const next = !photonEnabled;
              setPhotonEnabled(next);
              if (next && !photonPhone.trim()) {
                // Show phone input — don't save yet, wait for phone entry
                setPhotonError("Enter your phone number below to enable nudges.");
              } else {
                savePhotonSettings(next, photonPhone);
              }
            }}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt disabled:opacity-40 ${
              photonEnabled ? "bg-cobalt" : "bg-warm-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                photonEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Phone number input — show when toggled on or already has a number */}
        {(photonEnabled || photonPhone) && (
          <div className="space-y-2">
            <label
              htmlFor="photon-phone"
              className="block text-xs font-sans font-semibold text-charcoal/50 uppercase tracking-wide"
            >
              Phone number
            </label>
            <div className="flex gap-2">
              <input
                id="photon-phone"
                type="tel"
                value={photonPhone}
                onChange={(e) => {
                  setPhotonPhone(e.target.value);
                  setPhotonError(null);
                }}
                placeholder="+1 (555) 000-0000"
                className="flex-1 bg-warm-50 rounded-xl px-4 py-2.5 text-sm font-sans text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:ring-2 focus:ring-cobalt/50 border border-warm-200"
              />
              <button
                type="button"
                disabled={photonSaving || !photonPhone.trim()}
                onClick={() => savePhotonSettings(photonEnabled, photonPhone)}
                className="px-4 py-2.5 bg-cobalt text-white font-sans text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-cobalt/80 transition-colors active:scale-95"
              >
                Save
              </button>
            </div>
            <p className="font-sans text-[11px] text-charcoal/40">
              International format recommended, e.g. +1 555 000 0000
            </p>
          </div>
        )}

        {photonError && (
          <p className="font-sans text-xs text-cherry mt-2">{photonError}</p>
        )}

        {photonEnabled && photonPhone && !photonError && (
          <div className="mt-3 bg-cobalt/8 rounded-2xl px-4 py-3">
            <p className="font-sans text-xs text-cobalt font-semibold">Study companion active</p>
            <p className="font-sans text-xs text-charcoal/50 mt-0.5">
              Reply &quot;quiz me&quot;, &quot;explain simpler&quot;, or &quot;recap&quot; to any nudge.
            </p>
          </div>
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
    </div>
  );
}
