import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { useToast } from "../context/ToastContext";
import { SkeletonCard } from "../components/Skeleton";

function ScoreBadge({ score, status }) {
  if (status === "failed") {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Failed
      </span>
    );
  }
  if (status !== "completed" || score == null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
        {status === "processing" ? "Processing..." : "Pending"}
      </span>
    );
  }

  const color =
    score >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 40
      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold ${color}`}>
      {Math.round(score)}% match
    </span>
  );
}

export default function HistoryPage() {
  const toast = useToast();
  const [analyses, setAnalyses] = useState([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchAnalyses = async (skip = 0, append = false) => {
    try {
      const res = await client.get(`/analysis/?skip=${skip}&limit=20`);
      if (append) {
        setAnalyses((prev) => [...prev, ...res.data.items]);
      } else {
        setAnalyses(res.data.items);
      }
      setTotal(res.data.total);
      setHasMore(res.data.has_more);
    } catch {
      setError("Failed to load history");
    }
  };

  useEffect(() => {
    fetchAnalyses().finally(() => setLoading(false));
  }, []);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await fetchAnalyses(analyses.length, true);
    setLoadingMore(false);
  };

  const handleDelete = async (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this analysis? This cannot be undone.")) return;

    setDeletingId(id);
    try {
      await client.delete(`/analysis/${id}`);
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      setTotal((t) => t - 1);
      toast.success("Analysis deleted");
    } catch {
      toast.error("Failed to delete analysis");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-8" />
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analysis History</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {total} {total === 1 ? "analysis" : "analyses"} total
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
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {analyses.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No analyses yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
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
        <>
          <div className="grid gap-4">
            {analyses.map((a, i) => (
              <Link
                key={a.id}
                to={`/result/${a.id}`}
                className={`group block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md transition-all animate-fade-in stagger-${Math.min(i + 1, 10)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 dark:text-gray-200 font-medium truncate">
                      {a.job_description_preview}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(a.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ScoreBadge score={a.match_score} status={a.status} />
                    <button
                      onClick={(e) => handleDelete(e, a.id)}
                      disabled={deletingId === a.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer disabled:opacity-50"
                      title="Delete analysis"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
