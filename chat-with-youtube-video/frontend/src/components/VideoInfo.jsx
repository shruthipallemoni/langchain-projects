/*
  VideoInfo.jsx — Video Metadata + RAG Stats
  ───────────────────────────────────────────
  Shows info about the loaded video AND the RAG index stats:
  - Video thumbnail + link
  - Word count from transcript
  - Number of FAISS chunks (from RecursiveCharacterTextSplitter)
  - Whether the index was loaded from cache
  
  Props:
  - info: { videoId, wordCount, numChunks, cached }
*/

function VideoInfo({ info }) {
  const thumbnailUrl = `https://img.youtube.com/vi/${info.videoId}/mqdefault.jpg`;
  const videoUrl = `https://youtube.com/watch?v=${info.videoId}`;

  return (
    <div className="video-info-bar">
      {/* Clickable thumbnail */}
      <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="thumbnail-link">
        <img src={thumbnailUrl} alt="Video thumbnail" className="video-thumbnail" />
        <div className="thumbnail-overlay">
          <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </a>

      <div className="video-stats">
        {/* Video ID */}
        <div className="stat-item">
          <span className="stat-label">Video ID</span>
          <span className="stat-value stat-mono">{info.videoId}</span>
        </div>

        <div className="stat-divider" />

        {/* Word count from transcript */}
        <div className="stat-item">
          <span className="stat-label">Words</span>
          <span className="stat-value">{info.wordCount?.toLocaleString() ?? "—"}</span>
        </div>

        <div className="stat-divider" />

        {/* Number of FAISS chunks — each chunk is 500 chars with 100 overlap */}
        <div className="stat-item">
          <span className="stat-label">FAISS Chunks</span>
          <span className="stat-value stat-accent">{info.numChunks ?? "—"}</span>
          {/*
            stat-accent makes this stand out — it's the RAG-specific info.
            Each chunk = a 500-char window of the transcript that gets embedded.
          */}
        </div>

        <div className="stat-divider" />

        {/* Shows if FAISS index was already built (server-side cache) */}
        <div className="stat-item">
          <span className="stat-label">Index</span>
          <span className={`stat-badge ${info.cached ? "badge-cached" : "badge-fresh"}`}>
            {info.cached ? "⚡ Cached" : "✨ Fresh"}
            {/*
              Cached: FAISS index was already in server memory from a previous load.
              Fresh: We just built the index — transcript was split, embedded, indexed.
            */}
          </span>
        </div>

        <div className="stat-divider" />

        <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="watch-link">
          Watch ↗
        </a>
      </div>
    </div>
  );
}

export default VideoInfo;