import { UploadForm } from "@/components/UploadForm";

export default function UploadPage() {
  return (
    <div className="min-h-dvh bg-cream px-5 pb-24 pt-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-charcoal leading-tight">
          Drop your syllabus.
        </h1>
        <p className="font-sans text-charcoal/55 text-base mt-1.5">
          Paste notes, a reading, or lecture slides. We&apos;ll turn it into a feed worth scrolling.
        </p>
      </div>

      <UploadForm />
    </div>
  );
}
