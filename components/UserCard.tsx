import type { SimilarUser } from "@/lib/types";
import { InterestsPills } from "./InterestsPills";

interface UserCardProps {
  user: SimilarUser;
  currentUserInterests?: string[];
}

export function UserCard({ user, currentUserInterests = [] }: UserCardProps) {
  const initials = (user.display_name ?? "?")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const sharedInterests = user.interests.filter((i) =>
    currentUserInterests.includes(i)
  );

  return (
    <div className="bg-white/60 rounded-2xl p-4 border border-warm-200 shadow-soft flex items-start gap-3">
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-lavender/30 flex items-center justify-center">
        <span className="font-display font-bold text-sm text-lavender-deep">{initials}</span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="font-sans font-semibold text-sm text-charcoal truncate">
            {user.display_name ?? "Anonymous"}
          </p>
          <span className="flex-shrink-0 text-[10px] font-sans font-bold text-lavender-deep bg-lavender/20 rounded-full px-2 py-0.5">
            {user.overlap_count} shared
          </span>
        </div>

        {sharedInterests.length > 0 && (
          <InterestsPills
            interests={sharedInterests}
            highlightInterests={sharedInterests}
            size="sm"
          />
        )}

        {user.interests.filter((i) => !currentUserInterests.includes(i)).length > 0 && (
          <InterestsPills
            interests={user.interests.filter((i) => !currentUserInterests.includes(i))}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}
