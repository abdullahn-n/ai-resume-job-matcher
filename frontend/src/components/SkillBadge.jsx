export default function SkillBadge({ skill, variant = "matched" }) {
  const styles =
    variant === "matched"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-red-100 text-red-800 border-red-200";

  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${styles}`}
    >
      {skill}
    </span>
  );
}
