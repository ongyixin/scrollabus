"use client";

import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import type { SaveCategory } from "@/lib/types";

interface SaveCategorySheetProps {
  postId: string | null;
  currentlySaved: boolean;
  onClose: () => void;
  onConfirm: (saved: boolean) => void;
}

// Placeholder shown before the real API response arrives so the user sees
// "Favorites ✓" the instant the sheet opens.
const PRELOAD: SaveCategory = {
  id: "__favorites_pre__",
  user_id: "",
  name: "Favorites",
  created_at: "",
  post_count: 0,
};

export function SaveCategorySheet({ postId, currentlySaved, onClose, onConfirm }: SaveCategorySheetProps) {
  const [categories, setCategories] = useState<SaveCategory[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const isOpen = postId !== null;

  useEffect(() => {
    if (!isOpen) return;

    setNewCategoryName("");
    setIsAddingCategory(false);
    setAddError(null);

    if (!currentlySaved) {
      // Optimistically show Favorites as pre-selected — no spinner needed.
      setCategories([PRELOAD]);
      setSelected(new Set([PRELOAD.id]));
    } else {
      setCategories([]);
      setSelected(new Set());
    }

    loadCategories();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadCategories() {
    setIsFetching(true);
    try {
      const res = await fetch("/api/save-categories");
      if (!res.ok) return;

      const json = await res.json();
      const cats = json.categories as SaveCategory[];
      setCategories(cats);

      if (currentlySaved) {
        // Fetch which categories this post already belongs to
        const membershipsRes = await fetch(`/api/saved-posts/memberships?post_id=${postId}`);
        if (membershipsRes.ok) {
          const mJson = await membershipsRes.json();
          setSelected(new Set(mJson.category_ids as string[]));
        }
      } else {
        // Swap placeholder with real Favorites id (keeps the visual state)
        const favorites = cats.find((c) => c.name === "Favorites");
        setSelected(new Set(favorites ? [favorites.id] : []));
      }
    } finally {
      setIsFetching(false);
    }
  }

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAddCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    setAddError(null);

    const res = await fetch("/api/save-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      const json = await res.json();
      setAddError(json.error ?? "Failed to create category");
      return;
    }

    const json = await res.json();
    const created = json.category as SaveCategory;
    setCategories((prev) => [...prev.filter((c) => c.id !== PRELOAD.id), created]);
    setSelected((prev) => new Set([...prev, created.id]));
    setNewCategoryName("");
    setIsAddingCategory(false);
  }

  async function handleDone() {
    if (!postId || isSaving) return;

    // If the user tapped Done before real categories finished loading and the
    // placeholder is still in selected, wait for fetch to complete first so we
    // can swap it for the real Favorites ID.
    if (selected.has(PRELOAD.id) && isFetching) return;

    setIsSaving(true);

    // Exclude placeholder (should already be replaced by now).
    const realIds = [...selected].filter((id) => id !== PRELOAD.id);

    try {
      const res = await fetch("/api/saves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, category_ids: realIds }),
      });

      if (res.ok) {
        const json = await res.json();
        onConfirm(json.saved as boolean);
      }
    } finally {
      setIsSaving(false);
      onClose();
    }
  }

  // While fetching for a re-save (we have no optimistic data), show a spinner
  const showSpinner = currentlySaved && categories.length === 0 && isFetching;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-cream rounded-t-3xl max-h-[70vh] outline-none"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-charcoal/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <Drawer.Title className="font-display font-bold text-xl text-charcoal">
              Save to...
            </Drawer.Title>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-charcoal/50 hover:text-charcoal transition-colors"
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Category list */}
          <div className="flex-1 overflow-y-auto px-5 pb-2">
            {showSpinner ? (
              <div className="py-8 flex justify-center">
                <span className="w-5 h-5 rounded-full border-2 border-charcoal/20 border-t-charcoal/60 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((cat) => {
                  const isSelected = selected.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id)}
                      className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white border transition-all active:scale-[0.98]"
                      style={isSelected ? {
                        borderColor: "rgba(201,184,232,0.8)",
                        boxShadow: "0 0 0 2px rgba(201,184,232,0.5)",
                      } : {
                        borderColor: "rgba(0,0,0,0.08)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center transition-all"
                          style={isSelected ? {
                            background: "linear-gradient(135deg, #C9B8E8cc, #C9B8E8)",
                          } : {
                            border: "1.5px solid rgba(0,0,0,0.15)",
                          }}
                        >
                          {isSelected && (
                            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="2 6 5 9 10 3" />
                            </svg>
                          )}
                        </div>
                        <span className="font-sans font-medium text-sm text-charcoal">{cat.name}</span>
                      </div>
                      {cat.name === "Favorites" && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill={isSelected ? "#C9B8E8" : "none"}
                          stroke={isSelected ? "#C9B8E8" : "currentColor"}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-charcoal/30"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                    </button>
                  );
                })}

                {/* Loading indicator for additional categories (non-blocking) */}
                {isFetching && categories.length > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <span className="w-3 h-3 rounded-full border border-charcoal/20 border-t-charcoal/40 animate-spin" />
                    <span className="text-xs font-sans text-charcoal/30">Loading your categories…</span>
                  </div>
                )}

                {/* Add new category */}
                {!isFetching && (
                  isAddingCategory ? (
                    <div className="px-4 py-3 rounded-2xl bg-white border border-warm-200">
                      <input
                        autoFocus
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => { setNewCategoryName(e.target.value); setAddError(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCategory();
                          if (e.key === "Escape") { setIsAddingCategory(false); setNewCategoryName(""); }
                        }}
                        placeholder="Category name…"
                        className="w-full text-sm font-sans text-charcoal bg-transparent focus:outline-none placeholder:text-charcoal/35"
                        maxLength={40}
                      />
                      {addError && <p className="text-xs text-cherry mt-1">{addError}</p>}
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleAddCategory}
                          disabled={!newCategoryName.trim()}
                          className="text-xs font-sans font-semibold text-lavender-deep disabled:opacity-40 transition-opacity"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => { setIsAddingCategory(false); setNewCategoryName(""); setAddError(null); }}
                          className="text-xs font-sans text-charcoal/50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingCategory(true)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-dashed border-charcoal/20 text-charcoal/50 hover:text-charcoal/70 hover:border-charcoal/30 transition-colors"
                    >
                      <div className="w-5 h-5 rounded-md border-2 border-dashed border-charcoal/20 flex items-center justify-center">
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor">
                          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <span className="font-sans text-sm font-medium">New category</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 py-4 border-t border-warm-200 flex gap-3">
            {selected.size === 0 && currentlySaved ? (
              <button
                onClick={handleDone}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl bg-cherry text-white font-sans font-semibold text-sm disabled:opacity-50 transition-opacity active:scale-[0.98]"
              >
                {isSaving ? "Removing…" : "Remove from Saved"}
              </button>
            ) : (
              <button
                onClick={handleDone}
                disabled={isSaving}
                className="flex-1 py-3 rounded-2xl bg-charcoal text-white font-sans font-semibold text-sm disabled:opacity-50 transition-opacity active:scale-[0.98]"
              >
                {isSaving
                  ? "Saving…"
                  : selected.size === 0
                  ? "Done"
                  : `Save to ${selected.size} ${selected.size === 1 ? "category" : "categories"}`}
              </button>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
