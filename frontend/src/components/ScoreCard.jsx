export default function ScoreCard({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 70) return { stroke: "#22c55e", text: "text-green-600", bg: "bg-green-50", label: "Strong Match" };
    if (s >= 40) return { stroke: "#eab308", text: "text-yellow-600", bg: "bg-yellow-50", label: "Partial Match" };
    return { stroke: "#ef4444", text: "text-red-600", bg: "bg-red-50", label: "Weak Match" };
  };

  const color = getColor(score);

  return (
    <div className={`${color.bg} rounded-2xl p-8 flex flex-col items-center`}>
      <div className="relative w-44 h-44">
        <svg className="w-44 h-44 -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="12"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${color.text}`}>
            {Math.round(score)}%
          </span>
          <span className="text-sm text-gray-500">match</span>
        </div>
      </div>
      <p className={`mt-4 font-semibold text-lg ${color.text}`}>
        {color.label}
      </p>
    </div>
  );
}
