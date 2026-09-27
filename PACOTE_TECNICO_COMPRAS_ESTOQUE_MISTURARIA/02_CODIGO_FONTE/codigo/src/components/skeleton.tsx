import { motion } from "framer-motion";

// Subtle shimmer skeleton — premium tells: low contrast, soft loop, no jitter.
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-card ${className}`}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.6, ease: "linear", repeat: Infinity }}
      />
    </div>
  );
}

export function SkeletonRow({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-14 w-full ${className}`} />;
}

export function SkeletonStack({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return <Skeleton className={`h-32 w-full rounded-lg ${className}`} />;
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ["w-full", "w-11/12", "w-2/3"];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-4 ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}
