"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  {
    href: "/feed",
    label: "Feed",
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    inactiveIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/explore",
    label: "Explore",
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="9" />
        <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" fill="white" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
    inactiveIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: "/upload",
    label: "Upload",
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    inactiveIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/community",
    label: "Community",
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="7" r="3" />
        <path d="M2 20c0-3.314 3.134-6 7-6s7 2.686 7 6" />
        <path d="M15 14c2.21 0 4 1.79 4 4" strokeWidth="0" />
        <circle cx="18" cy="13" r="2.5" />
        <path d="M15.5 18c0-1.933 1.119-3.5 2.5-3.5" />
      </svg>
    ),
    inactiveIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="7" r="3" />
        <path d="M2 20c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round" />
        <circle cx="16" cy="8" r="2.5" />
        <path d="M22 20c0-2.761-2.239-5-5-5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "Profile",
    activeIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" />
      </svg>
    ),
    inactiveIcon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-warm-200"
      style={{
        background: "rgba(255,248,240,0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 -1px 0 rgba(222,204,170,0.6), 0 -8px 32px rgba(26,22,18,0.04)",
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-colors relative"
            >
              {/* Active glow pill */}
              {isActive && (
                <motion.div
                  layoutId="nav-active-glow"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(201,184,232,0.25), rgba(201,184,232,0.1))",
                    border: "1px solid rgba(201,184,232,0.3)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {/* Active indicator dot */}
              {isActive && (
                <motion.div
                  layoutId="nav-dot"
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-5 h-1 rounded-full bg-charcoal"
                  style={{
                    boxShadow: "0 0 6px rgba(45,41,38,0.4)",
                  }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <motion.div
                whileTap={{ scale: 0.82 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className={`relative z-10 ${isActive ? "text-charcoal" : "text-charcoal/35"}`}
              >
                {isActive ? item.activeIcon : item.inactiveIcon}
              </motion.div>

              <span className={`text-[10px] font-sans font-semibold relative z-10 transition-colors ${
                isActive ? "text-charcoal" : "text-charcoal/35"
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* iOS safe area fill */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
