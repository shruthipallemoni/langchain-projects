/*
  VideoLoader.jsx — URL Input with Pipeline Visualization
  ─────────────────────────────────────────────────────────
  Same as before but now shows the RAG pipeline steps visually
  so the user understands what's happening when they click "Load Video".
  
  Props: url, onUrlChange, onLoad, onReset, isLoading, hasVideo, error
*/

function VideoLoader({ url, onUrlChange, onLoad, onReset, isLoading, hasVideo, error }) {

  const handleKeyDown = (e) => {
    if (e.key === "Enter") onLoad();
  };

  // The RAG pipeline steps — shown as a visual chain below the input
  const pipelineSteps = [
    "YouTube URL",
    "Transcript",
    "Splitter (500ch)",
    "MiniLM Embed",
    "FAISS Index",
    "Retriever (k=4)",
    "Llama 3.3 70B",
    "Answer",
  ];

  return (
    <section className="video-loader">
      <div className="loader-card">

        <div className="loader-header">
          <h2 className="loader-title">
            {hasVideo ? "🎬 Video Indexed" : "YouTube RAG Q&A"}
          </h2>
          <p className="loader-subtitle">
            {hasVideo
              ? "Your video's transcript is split, embedded, and stored in FAISS."
              : "Paste a YouTube URL. We'll build a RAG index and let you question it."}
          </p>
        </div>

        {/* Visual pipeline chain — only shown before loading */}
        {!hasVideo && (
          <div className="pipeline-steps">
            {pipelineSteps.map((step, i) => (
              <div key={step} className="pipeline-step">
                <span className="step-label">{step}</span>
                {/* Show arrow between steps, not after the last one */}
                {i < pipelineSteps.length - 1 && (
                  <span className="step-arrow">→</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* URL Input row */}
        <div className="url-input-row">
          <div className="input-wrapper">
            <svg className="input-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <input
              type="url"
              className="url-input"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
          </div>

          {hasVideo ? (
            <button className="btn btn-secondary" onClick={onReset}>
              ↺ New Video
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onLoad}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? (
                <span className="loading-text">
                  <span className="spinner" /> Indexing...
                </span>
              ) : (
                "Build Index →"
              )}
            </button>
          )}
        </div>

        {/* Progress bar while RAG pipeline is running */}
        {isLoading && (
          <div className="loading-progress">
            <div className="progress-bar-track">
              <div className="progress-bar-fill" />
              {/*
                Animated shimmer bar.
                This is indeterminate (no real progress %) because we don't
                know exactly how long the transcript/embed step will take.
                A shimmer is more honest than a fake percentage.
              */}
            </div>
            <p className="progress-label">
              Fetching transcript → splitting → embedding → building FAISS index...
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {!hasVideo && !error && !isLoading && (
          <p className="loader-hint">
            Works with any public YouTube video with captions. Auto-generated captions are fine.
          </p>
        )}
      </div>
    </section>
  );
}

export default VideoLoader;