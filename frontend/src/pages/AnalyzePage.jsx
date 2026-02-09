import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";

export default function AnalyzePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState("");

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile?.type === "application/pdf") {
      setFile(droppedFile);
      setError("");
    } else {
      setError("Please upload a PDF file");
    }
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected?.type === "application/pdf") {
      setFile(selected);
      setError("");
    } else if (selected) {
      setError("Please upload a PDF file");
    }
  };

  const pollForResult = async (analysisId) => {
    const maxAttempts = 60; // 2 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await client.get(`/analysis/${analysisId}`);
        const { status: s } = res.data;
        if (s === "completed") {
          navigate(`/result/${analysisId}`);
          return;
        }
        if (s === "failed") {
          setError(res.data.error_message || "Analysis failed. Please try again.");
          setSubmitting(false);
          return;
        }
        setStatus(s === "processing" ? "AI is analyzing your resume..." : "Queued...");
      } catch {
        // Ignore poll errors, keep trying
      }
    }
    setError("Analysis timed out. Please try again.");
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Please upload your resume PDF");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Please paste the job description");
      return;
    }

    setSubmitting(true);
    setStatus("Uploading...");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("job_description", jobDescription);

      const res = await client.post("/analysis/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setStatus("Processing...");
      pollForResult(res.data.id);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to submit. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Analyze Your Resume
        </h1>
        <p className="text-gray-500 mt-2">
          Upload your resume and paste the job description to get an AI-powered
          skill match analysis
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* PDF Upload Zone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Resume (PDF)
          </label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-indigo-500 bg-indigo-50"
                : file
                ? "border-green-400 bg-green-50"
                : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
            }`}
          >
            {file ? (
              <div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-medium text-green-700">{file.name}</p>
                <p className="text-sm text-green-600 mt-1">
                  {(file.size / 1024).toFixed(1)} KB - Click or drop to replace
                </p>
              </div>
            ) : (
              <div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="font-medium text-gray-700">
                  Drag & drop your resume PDF here
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  or click to browse files
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-y"
            placeholder="Paste the full job description here..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-3">
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {status}
            </span>
          ) : (
            "Analyze Resume"
          )}
        </button>
      </form>
    </div>
  );
}
