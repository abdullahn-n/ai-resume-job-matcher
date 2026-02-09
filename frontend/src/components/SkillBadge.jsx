export default function SkillBadge({ skill, variant = "matched", className = "" }) {
  const styles =
    variant === "matched"
      ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"
      : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${styles} animate-fade-in ${className}`}
    >
      {skill}
    </span>
  );
}
