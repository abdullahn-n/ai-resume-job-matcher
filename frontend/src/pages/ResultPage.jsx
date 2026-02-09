import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../api/client";
import ScoreCard from "../components/ScoreCard";
import SkillBadge from "../components/SkillBadge";
import SuggestionList from "../components/SuggestionList";

export default function ResultPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchResult = async () => {
      try {
        const res = await client.get(`/analysis/${id}`);
        if (cancelled) return;

        if (res.data.status === "completed" || res.data.status === "failed") {
          setAnalysis(res.data);
          setLoading(false);
        } else {
          // Still processing, poll again
          setTimeout(fetchResult, 2000);
        }
      } catch (err) {
        if (!cancelled) {
          setError("Failed to load analysis results.");
          setLoading(false);
        }
      }
    };

    fetchResult();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500">Waiting for analysis results...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-red-600 mb-4">{error || "Analysis not found"}</p>
        <Link to="/analyze" className="text-indigo-600 hover:underline font-medium">
          Try a new analysis
        </Link>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="bg-red-50 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-red-700 mb-2">Analysis Failed</h2>
          <p className="text-red-600 mb-6">{analysis.error_message || "An unexpected error occurred."}</p>
          <Link
            to="/analyze"
            className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analysis Results</h1>
        <div className="flex gap-3">
          <Link
            to="/analyze"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
          >
            New Analysis
          </Link>
          <Link
            to="/history"
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            View History
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score */}
        <div className="lg:col-span-1">
          <ScoreCard score={analysis.match_score} />
        </div>

        {/* Skills */}
        <div className="lg:col-span-2 space-y-6">
          {/* Matched Skills */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Matched Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.matched_skills?.length > 0 ? (
                analysis.matched_skills.map((skill) => (
                  <SkillBadge key={skill} skill={skill} variant="matched" />
                ))
              ) : (
                <p className="text-gray-400 text-sm">No matched skills found</p>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Missing Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.missing_skills?.length > 0 ? (
                analysis.missing_skills.map((skill) => (
                  <SkillBadge key={skill} skill={skill} variant="missing" />
                ))
              ) : (
                <p className="text-gray-400 text-sm">No missing skills - great match!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {analysis.suggestions?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Suggestions to Improve Your Resume
          </h3>
          <SuggestionList suggestions={analysis.suggestions} />
        </div>
      )}

      {/* Job Description Preview */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Job Description
        </h3>
        <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">
          {analysis.job_description}
        </p>
      </div>
    </div>
  );
}
