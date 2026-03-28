"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { InterestsPills } from "./InterestsPills";

interface InterestsInputProps {
  initialInterests?: string[];
  onSaved?: (interests: string[]) => void;
  placeholder?: string;
}

export function InterestsInput({
  initialInterests = [],
  onSaved,
  placeholder = "e.g. biology, algorithms, ancient rome…",
}: InterestsInputProps) {
  const [interests, setInterests] = useState<string[]>(initialInterests);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addInterest(raw: string) {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests((prev) => [...prev, trimmed]);
    }
    setInputValue("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addInterest(inputValue);
    }
    if (e.key === "Backspace" && inputValue === "" && interests.length > 0) {
      setInterests((prev) => prev.slice(0, -1));
    }
  }

  function handleBlur() {
    if (inputValue.trim()) {
      addInterest(inputValue);
    }
  }

  function removeInterest(interest: string) {
    setInterests((prev) => prev.filter((i) => i !== interest));
  }

  async function handleSave() {
    if (interests.length === 0) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile/interests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      });
      if (res.ok) {
        const json = await res.json();
        setSavedOnce(true);
        onSaved?.(json.interests);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Tag-style input box */}
      <div
        className="flex flex-wrap gap-2 min-h-[48px] bg-white/70 border border-warm-200 rounded-2xl px-3 py-2.5 cursor-text shadow-soft"
        onClick={() => inputRef.current?.focus()}
      >
        <InterestsPills interests={interests} removable onRemove={removeInterest} size="md" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={interests.length === 0 ? placeholder : "add more…"}
          className="flex-1 min-w-[120px] bg-transparent outline-none font-sans text-sm text-charcoal placeholder:text-charcoal/40"
        />
      </div>

      <p className="text-[11px] font-sans text-charcoal/40 px-1">
        Press <kbd className="bg-warm-100 rounded px-1 py-0.5 text-[10px]">Enter</kbd> or{" "}
        <kbd className="bg-warm-100 rounded px-1 py-0.5 text-[10px]">,</kbd> to add a tag
      </p>

      <button
        type="button"
        onClick={handleSave}
        disabled={interests.length === 0 || isSaving}
        className="w-full py-2.5 rounded-2xl font-sans font-semibold text-sm transition-all bg-lavender-deep text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-lavender-deep/90 active:scale-95"
      >
        {isSaving ? "Saving…" : savedOnce ? "Update interests" : "Save interests"}
      </button>
    </div>
  );
}
