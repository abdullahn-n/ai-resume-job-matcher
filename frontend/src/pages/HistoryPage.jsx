import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";

function ScoreBadge({ score, status }) {
  if (status === "failed") {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
        Failed
      </span>
    );
  }
  if (status !== "completed" || score == null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
        {status === "processing" ? "Processing..." : "Pending"}
      </span>
    );
  }

  const color =
    score >= 70
      ? "bg-green-100 text-green-700"
      : score >= 40
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
      {Math.round(score)}% match
    </span>
  );
}

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    client
      .get("/analysis/")
      .then((res) => setAnalyses(res.data))
      .catch(() => setError("Failed to load history"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis History</h1>
          <p className="text-gray-500 mt-1">
            {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"} total
          </p>
        </div>
        <Link
          to="/analyze"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
        >
          New Analysis
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No analyses yet
          </h3>
          <p className="text-gray-500 mb-6">
            Upload your first resume to get started
          </p>
          <Link
            to="/analyze"
            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Start Analyzing
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {analyses.map((a) => (
            <Link
              key={a.id}
              to={`/result/${a.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 font-medium truncate">
                    {a.job_description_preview}
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    {new Date(a.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <ScoreBadge score={a.match_score} status={a.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
