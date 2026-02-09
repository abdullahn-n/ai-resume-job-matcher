export default function SuggestionList({ suggestions }) {
  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, i) => (
        <div
          key={i}
          className={`flex gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 animate-fade-in stagger-${i + 1}`}
        >
          <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full flex items-center justify-center text-sm font-semibold">
            {i + 1}
          </div>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{suggestion}</p>
        </div>
      ))}
    </div>
  );
}
