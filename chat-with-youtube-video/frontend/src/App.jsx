/*
  App.jsx — Root Component (Updated for RAG backend)
  ────────────────────────────────────────────────────
  Key change from the non-RAG version:
  
  BEFORE (naive approach):
    - Frontend stored the entire transcript
    - Sent the FULL transcript with every question to the LLM
    - Problem: slow, expensive, LLM gets confused with too much text
  
  NOW (RAG approach):
    - Frontend only knows the video_id after loading
    - Backend stores the FAISS index keyed by video_id
    - Each question only sends: { video_id, question }
    - Backend does: embed question → FAISS search → retrieve 4 chunks → Groq LLM
    - Much faster, more accurate, scales to any video length
*/

import { useState, useRef, useEffect } from "react";
import VideoLoader from "./components/VideoLoader";
import ChatInterface from "./components/ChatInterface";
import VideoInfo from "./components/VideoInfo";
import "./App.css";

function App() {

  // The YouTube URL the user typed
  const [url, setUrl] = useState("");

  // The 11-char video ID returned after loading (e.g. "dQw4w9WgXcQ")
  // This is the KEY for the server-side FAISS index — all we need to ask questions
  const [videoId, setVideoId] = useState(null);

  // Metadata about the loaded video (chunk count, word count etc.)
  const [videoInfo, setVideoInfo] = useState(null);

  // Loading state while the RAG pipeline is being built (transcript → split → embed → FAISS)
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);

  // Error messages to display to the user
  const [error, setError] = useState("");

  // Chat history: [{ role: "user"|"assistant", content: "..." }]
  const [messages, setMessages] = useState([]);

  // True while Groq is generating (streaming) an answer
  const [isStreaming, setIsStreaming] = useState(false);

  // Ref to the bottom of the messages list for auto-scrolling
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // ── Load Video Handler ──────────────────────────────────────────────────────
  const handleLoadVideo = async () => {
    if (!url.trim()) return;

    setError("");
    setIsLoadingVideo(true);
    setVideoId(null);
    setMessages([]);
    setVideoInfo(null);

    try {
      /*
        POST to /api/load-video with just the URL.
        The backend will:
          1. Extract video ID
          2. Fetch YouTube transcript
          3. Split with RecursiveCharacterTextSplitter (chunk_size=500, overlap=100)
          4. Embed each chunk with HuggingFace all-MiniLM-L6-v2
          5. Store in FAISS index (keyed by video_id in server memory)
        
        This takes 5-15 seconds depending on video length.
        After this, the frontend only needs to remember the video_id.
      */
      const response = await fetch("http://localhost:8000/api/load-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load video");
      }

      // Store the video ID — this is all we need for future questions
      setVideoId(data.video_id);
      setVideoInfo({
        videoId: data.video_id,
        wordCount: data.word_count,
        numChunks: data.num_chunks,
        cached: data.cached,
      });

      // Welcome message telling the user the RAG index is ready
      setMessages([{
        role: "assistant",
        content: data.cached
          ? `✅ Video already indexed! Ready to answer your questions.`
          : `✅ Video indexed! Split into **${data.num_chunks} semantic chunks** and stored in FAISS.\n\nI'll retrieve the most relevant sections for each question. What would you like to know?`,
      }]);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoadingVideo(false);
    }
  };


  // ── Ask Question Handler (RAG) ──────────────────────────────────────────────
  const handleAskQuestion = async (question) => {
    if (!question.trim() || isStreaming) return;

    // Add user message to chat
    setMessages(prev => [...prev, { role: "user", content: question }]);

    // Add empty assistant placeholder (will fill in as tokens stream)
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    setIsStreaming(true);

    try {
      /*
        POST to /api/ask with ONLY video_id and question.
        NO transcript is sent — the server retrieves relevant chunks from FAISS.
        
        Server pipeline per question:
          1. Embed question → 384-dim vector (using same all-MiniLM-L6-v2 model)
          2. FAISS cosine similarity search → top 4 most relevant chunks
          3. Chunks + question → Prompt Template
          4. Groq Llama 3.3 70B generates answer
          5. Streams tokens back as SSE events
        
        This is the RAG magic: instead of reading 10,000 words,
        the LLM reads ~2,000 characters of the most relevant parts.
      */
      const response = await fetch("http://localhost:8000/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          question: question,
          // Notice: no "transcript" field — the server handles retrieval!
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get answer");
      }

      // Read the SSE (Server-Sent Events) stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.chunk) {
                accumulatedText += parsed.chunk;
                // Update the last message (assistant placeholder) with new text
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulatedText,
                  };
                  return updated;
                });
              }

              if (parsed.done) break;

            } catch (parseErr) {
              console.warn("SSE parse error:", parseErr);
            }
          }
        }
      }

    } catch (err) {
      // Show error in the assistant bubble
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: `❌ ${err.message}`,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };


  // ── Reset Handler ───────────────────────────────────────────────────────────
  const handleReset = () => {
    // Note: this clears frontend state only.
    // The FAISS index stays alive on the server until it restarts.
    // If the user loads the same video again, the server returns cached=true.
    setUrl("");
    setVideoId(null);
    setVideoInfo(null);
    setMessages([]);
    setError("");
  };


  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="currentColor" className="yt-icon">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span className="logo-text">YT<span className="logo-accent">Insight</span></span>
          </div>
          <div className="header-right">
            <div className="rag-badge">
              <span className="rag-dot" />
              RAG · FAISS · Llama 3.3 70B
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <VideoLoader
          url={url}
          onUrlChange={setUrl}
          onLoad={handleLoadVideo}
          onReset={handleReset}
          isLoading={isLoadingVideo}
          hasVideo={!!videoId}
          error={error}
        />

        {videoId && (
          <div className="content-area">
            {videoInfo && <VideoInfo info={videoInfo} />}
            <ChatInterface
              messages={messages}
              onSendMessage={handleAskQuestion}
              isStreaming={isStreaming}
              messagesEndRef={messagesEndRef}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;