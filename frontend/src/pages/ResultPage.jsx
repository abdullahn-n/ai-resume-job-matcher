import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import client from "../api/client";
import ScoreCard from "../components/ScoreCard";
import SkillBadge from "../components/SkillBadge";
import SuggestionList from "../components/SuggestionList";
import { SkeletonScore, SkeletonSkills } from "../components/Skeleton";

export default function ResultPage() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef(null);

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

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <SkeletonScore />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <SkeletonSkills />
            <SkeletonSkills />
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error || "Analysis not found"}</p>
        <Link to="/analyze" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
          Try a new analysis
        </Link>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center animate-fade-in">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Analysis Failed</h2>
          <p className="text-red-600 dark:text-red-300 mb-6">{analysis.error_message || "An unexpected error occurred."}</p>
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
    <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in" ref={printRef}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analysis Results</h1>
        <div className="flex gap-3 no-print">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm cursor-pointer"
          >
            Download PDF
          </button>
          <Link
            to="/analyze"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
          >
            New Analysis
          </Link>
          <Link
            to="/history"
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
          >
            History
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Matched Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.matched_skills?.length > 0 ? (
                analysis.matched_skills.map((skill, i) => (
                  <SkillBadge key={skill} skill={skill} variant="matched" className={`stagger-${i + 1}`} />
                ))
              ) : (
                <p className="text-gray-400 dark:text-gray-500 text-sm">No matched skills found</p>
              )}
            </div>
          </div>

          {/* Missing Skills */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Missing Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {analysis.missing_skills?.length > 0 ? (
                analysis.missing_skills.map((skill, i) => (
                  <SkillBadge key={skill} skill={skill} variant="missing" className={`stagger-${i + 1}`} />
                ))
              ) : (
                <p className="text-green-600 dark:text-green-400 text-sm font-medium">No missing skills -- great match!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suggestions */}
      {analysis.suggestions?.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Suggestions to Improve Your Resume
          </h3>
          <SuggestionList suggestions={analysis.suggestions} />
        </div>
      )}

      {/* Job Description Preview */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Job Description
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
          {analysis.job_description}
        </p>
      </div>
    </div>
  );
}
