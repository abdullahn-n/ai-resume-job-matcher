export function SkeletonBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-5 w-3/4" />
          <SkeletonBlock className="h-4 w-1/3" />
        </div>
        <SkeletonBlock className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonScore() {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center">
      <SkeletonBlock className="w-44 h-44 rounded-full" />
      <SkeletonBlock className="h-6 w-32 mt-4" />
    </div>
  );
}

export function SkeletonSkills() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 space-y-3">
      <SkeletonBlock className="h-4 w-32" />
      <div className="flex flex-wrap gap-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonBlock key={i} className="h-7 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}
