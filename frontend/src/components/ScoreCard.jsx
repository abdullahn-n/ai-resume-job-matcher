import { useEffect, useRef, useState } from "react";

export default function ScoreCard({ score }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (score / 100) * circumference;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      // Trigger animation after mount
      requestAnimationFrame(() => {
        setAnimatedOffset(targetOffset);
      });
    }
  }, [targetOffset]);

  const getColor = (s) => {
    if (s >= 70) return { stroke: "#22c55e", text: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", label: "Strong Match" };
    if (s >= 40) return { stroke: "#eab308", text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", label: "Partial Match" };
    return { stroke: "#ef4444", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", label: "Weak Match" };
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
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
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
            strokeDashoffset={animatedOffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-bold ${color.text}`}>
            {Math.round(score)}%
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">match</span>
        </div>
      </div>
      <p className={`mt-4 font-semibold text-lg ${color.text}`}>
        {color.label}
      </p>
    </div>
  );
}
