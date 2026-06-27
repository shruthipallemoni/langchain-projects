"""
YouTube Q&A Backend — FastAPI + RAG Pipeline
─────────────────────────────────────────────
Full RAG (Retrieval-Augmented Generation) architecture:

  YouTube URL
      ↓
  Transcript Extraction       ← youtube-transcript-api
      ↓
  RecursiveCharacterTextSplitter  ← splits into overlapping chunks
      ↓
  HuggingFace Embeddings      ← converts text chunks → vectors
      ↓
  FAISS Vector Store          ← stores & indexes vectors in memory
      ↓
  Retriever                   ← finds top-k relevant chunks for query
      ↓
  Groq Llama 3.3 70B          ← generates answer from retrieved chunks
      ↓
  Streaming Answer            ← streamed token by token to React frontend
"""

# ── Standard library ───────────────────────────────────────────────────────────
import os
from dotenv import load_dotenv
load_dotenv()

# ── Proxy config (only if PROXY_USER and PROXY_PASS are set in .env) ──────────
PROXY_USER = os.getenv("PROXY_USER")
PROXY_PASS = os.getenv("PROXY_PASS")

if PROXY_USER and PROXY_PASS:
    PROXY_URL = f"http://{PROXY_USER}:{PROXY_PASS}@hostelinternet.rgukt.ac.in:3128"
    os.environ["HTTP_PROXY"]  = PROXY_URL
    os.environ["HTTPS_PROXY"] = PROXY_URL
    os.environ["http_proxy"]  = PROXY_URL
    os.environ["https_proxy"] = PROXY_URL
    print(f"Proxy configured: {PROXY_URL}")

import json
import re
from typing import AsyncGenerator

# ── FastAPI ────────────────────────────────────────────────────────────────────
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# ── YouTube Transcript ─────────────────────────────────────────────────────────
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
)

# ── LangChain: Text Splitting ──────────────────────────────────────────────────
from langchain_text_splitters import RecursiveCharacterTextSplitter

# ── LangChain: Embeddings ──────────────────────────────────────────────────────
from langchain_community.embeddings import HuggingFaceEmbeddings

# ── LangChain: FAISS Vector Store ─────────────────────────────────────────────
from langchain_community.vectorstores import FAISS

# ── LangChain: Groq LLM ───────────────────────────────────────────────────────
from langchain_groq import ChatGroq

# ── LangChain: Chains & Prompts ────────────────────────────────────────────────
from langchain_core.prompts import ChatPromptTemplate


# ── In-Memory Session Store ────────────────────────────────────────────────────
video_stores: dict[str, FAISS] = {}


# ── App Init ───────────────────────────────────────────────────────────────────
app = FastAPI(title="YouTube RAG Q&A API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://langchain-projects-liart.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Embedding Model (loaded lazily to reduce startup memory and disk use) ─────
embeddings = None


def get_embeddings() -> HuggingFaceEmbeddings:
    global embeddings
    if embeddings is None:
        model_name = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
        cache_dir = os.getenv("HF_HOME", "/tmp/hf-cache")
        os.makedirs(cache_dir, exist_ok=True)
        print(f"Loading embedding model '{model_name}' from {cache_dir}...")
        embeddings = HuggingFaceEmbeddings(
            model_name=model_name,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
            cache_folder=cache_dir,
        )
        print("Embedding model loaded.")
    return embeddings


# ── Helper: Extract YouTube Video ID ──────────────────────────────────────────
def extract_video_id(url: str) -> str | None:
    """
    Extracts the 11-character video ID from various YouTube URL formats:
      https://www.youtube.com/watch?v=dQw4w9WgXcQ  →  dQw4w9WgXcQ
      https://youtu.be/dQw4w9WgXcQ                 →  dQw4w9WgXcQ
      https://www.youtube.com/embed/dQw4w9WgXcQ    →  dQw4w9WgXcQ
    """
    patterns = [
        r"(?:v=)([a-zA-Z0-9_-]{11})",
        r"(?:youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:embed/)([a-zA-Z0-9_-]{11})",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

# ── Updated fetch_transcript function ─────────────────────────────────────────
def fetch_transcript(video_id: str) -> str:
    try:
        ytt = YouTubeTranscriptApi()
        fetched = ytt.fetch(video_id)           # returns FetchedTranscript object
        full_text = " ".join(seg.text for seg in fetched)
        return full_text
    except NoTranscriptFound:
        raise HTTPException(
            status_code=404,
            detail="No transcript found. Try a video with subtitles enabled."
        )
    except TranscriptsDisabled:
        raise HTTPException(
            status_code=403,
            detail="Captions are disabled for this video."
        )
    except VideoUnavailable:
        raise HTTPException(
            status_code=404,
            detail="Video is unavailable or private."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcript fetch failed: {str(e)}")
    
# ── Helper: Build FAISS Vector Store from Transcript ──────────────────────────
def build_vector_store(transcript: str) -> tuple[FAISS, int, int]:
    """
    Runs the full pipeline:
      raw transcript text
          → RecursiveCharacterTextSplitter
          → HuggingFaceEmbeddings
          → FAISS vector store
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100,
        separators=["\n\n", "\n", ". ", "? ", "! ", " ", ""],
    )

    chunks = splitter.split_text(transcript)

    if not chunks:
        raise HTTPException(status_code=422, detail="Transcript too short to process.")

    vector_store = FAISS.from_texts(
        texts=chunks,
        embedding=get_embeddings(),
    )

    return vector_store, len(chunks), len(transcript.split())


# ── Pydantic Request Models ────────────────────────────────────────────────────
class LoadVideoRequest(BaseModel):
    url: str

class AskRequest(BaseModel):
    video_id: str
    question: str


# ── Endpoint 1: Load Video + Build Vector Store ────────────────────────────────
@app.post("/api/load-video")
async def load_video(request: LoadVideoRequest):
    """
    POST /api/load-video
    Body: { "url": "https://youtube.com/watch?v=..." }

    Pipeline: URL → video ID → transcript → split → embed → FAISS index
    """
    video_id = extract_video_id(request.url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Invalid YouTube URL.")

    if video_id in video_stores:
        return {
            "video_id": video_id,
            "message": "Video already loaded (using cached index)",
            "cached": True,
        }

    transcript = fetch_transcript(video_id)

    try:
        vector_store, num_chunks, word_count = build_vector_store(transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build vector store: {str(e)}")

    video_stores[video_id] = vector_store

    return {
        "video_id": video_id,
        "word_count": word_count,
        "num_chunks": num_chunks,
        "message": f"Transcript split into {num_chunks} chunks and indexed in FAISS.",
        "cached": False,
    }


# ── Endpoint 2: Ask Question (RAG + Streaming) ─────────────────────────────────
@app.post("/api/ask")
async def ask_question(request: AskRequest):
    """
    POST /api/ask
    Body: { "video_id": "...", "question": "..." }

    Pipeline: question → embed → FAISS search → top-4 chunks → Groq → stream answer
    """
    if request.video_id not in video_stores:
        raise HTTPException(
            status_code=404,
            detail="Video not loaded. Please load the video first."
        )

    vector_store = video_stores[request.video_id]

    groq_api_key = os.environ.get("GROQ_API_KEY")
    if not groq_api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY not set. Add it to your .env file."
        )

    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        groq_api_key=groq_api_key,
        temperature=0.2,
        streaming=True,
        max_tokens=1024,
    )

    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 4},
    )
    
    prompt_template = """You are an intelligent assistant helping users understand a YouTube video.

You have access to transcript excerpts from the video retrieved by semantic search.
Use them as your PRIMARY source, but you may also use your general knowledge to:
- Summarize or conclude based on all excerpts provided
- Answer general questions (like math) directly
- Infer meaning when the exact phrase isn't in the transcript

Transcript Excerpts:
{context}

User Question: {question}

Guidelines:
- For summarization/conclusion: synthesize ALL the excerpts above into a coherent response
- For general questions unrelated to the video: answer directly
- Only say "I couldn't find that in the video" if the question is very specific and truly absent
- Keep answers clear and concise
"""

    PROMPT = ChatPromptTemplate.from_template(prompt_template)

    async def stream_response() -> AsyncGenerator[str, None]:
        try:
            # Retrieve relevant chunks
            retrieved_docs = retriever.invoke(request.question)
            context = "\n".join([doc.page_content for doc in retrieved_docs])
            
            # Format the prompt
            formatted_prompt = PROMPT.format_messages(
                context=context,
                question=request.question
            )
            
            # Stream the response
            async for chunk in llm.astream(formatted_prompt):
                if chunk.content:
                    yield f"data: {json.dumps({'chunk': chunk.content})}\n\n"

            yield f"data: {json.dumps({'done': True})}\n\n"

        except Exception as e:
            error_msg = str(e)
            if "rate_limit" in error_msg.lower():
                yield f"data: {json.dumps({'error': 'Groq rate limit reached. Wait a moment and try again.'})}\n\n"
            elif "api_key" in error_msg.lower() or "authentication" in error_msg.lower():
                yield f"data: {json.dumps({'error': 'Invalid GROQ_API_KEY. Check your .env file.'})}\n\n"
            else:
                yield f"data: {json.dumps({'error': f'Error: {error_msg}'})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Endpoint 3: List Loaded Videos ────────────────────────────────────────────
@app.get("/api/loaded-videos")
async def get_loaded_videos():
    """Lists all video IDs currently in memory — useful for debugging."""
    return {
        "loaded_videos": list(video_stores.keys()),
        "count": len(video_stores),
    }


# ── Endpoint 4: Health Check ───────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "embedding_model": "all-MiniLM-L6-v2",
        "llm": "llama-3.3-70b-versatile (Groq)",
        "vector_store": "FAISS (in-memory)",
        "videos_in_memory": len(video_stores),
        "proxy_enabled": bool(PROXY_USER and PROXY_PASS),
    }


# ── Entry Point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)