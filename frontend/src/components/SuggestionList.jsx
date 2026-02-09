export default function SuggestionList({ suggestions }) {
  return (
    <div className="space-y-3">
      {suggestions.map((suggestion, i) => (
        <div
          key={i}
          className="flex gap-3 bg-white border border-gray-200 rounded-xl p-4"
        >
          <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold">
            {i + 1}
          </div>
          <p className="text-gray-700 text-sm leading-relaxed">{suggestion}</p>
        </div>
      ))}
    </div>
  );
}
