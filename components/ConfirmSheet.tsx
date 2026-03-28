"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading,
}: ConfirmSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="confirm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => !loading && onCancel()}
          />
          <motion.div
            key="confirm-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-cream rounded-t-[2rem] shadow-card-hover px-5 pt-4 pb-6"
          >
            <div className="w-10 h-1 bg-warm-300 rounded-full mx-auto mb-5" />

            {/* Warning icon */}
            <div className="w-12 h-12 rounded-full bg-cherry/10 flex items-center justify-center mx-auto mb-4">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-cherry"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </div>

            <h2 className="font-display font-bold text-xl text-charcoal text-center mb-1.5">
              {title}
            </h2>
            <p className="font-sans text-sm text-charcoal/60 text-center leading-relaxed mb-6">
              {description}
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className="w-full bg-cherry text-white font-sans font-semibold py-3.5 rounded-2xl hover:bg-cherry/90 transition-colors disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                )}
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="w-full border border-warm-300 bg-white/60 rounded-2xl py-3 font-sans font-semibold text-sm text-charcoal hover:bg-white transition-colors active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
