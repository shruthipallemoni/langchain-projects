# YouTube Video Q&A

A local YouTube Q&A app that indexes video transcripts with a Retrieval-Augmented Generation (RAG) pipeline.

## Project Overview

This repository contains:
- `backend/` — FastAPI service that:
  - extracts YouTube transcripts
  - splits text into semantic chunks
  - embeds chunks with HuggingFace `all-MiniLM-L6-v2`
  - stores embeddings in FAISS
  - answers questions using a Groq-powered LLM over retrieved chunks
- `frontend/` — React + Vite web UI for:
  - loading a YouTube video URL
  - building the backend RAG index
  - asking questions about the video
  - displaying streaming answers

## Architecture

1. User pastes a YouTube URL in the frontend.
2. Frontend posts the URL to `backend/api/load-video`.
3. Backend fetches the transcript, splits it, builds embeddings, and stores them in FAISS.
4. Frontend receives a `video_id` and uses it for later questions.
5. When the user asks a question, the frontend posts `video_id` + `question` to `backend/api/ask`.
6. Backend retrieves the most relevant transcript chunks and generates an answer with the LLM.

## Prerequisites

- Python 3.11+ (recommended)
- Node.js 18+ / npm
- Public YouTube videos with captions enabled

## Backend Setup

1. Open a terminal in `backend/`.
2. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1    # PowerShell
   # or .\.venv\Scripts\activate.bat for cmd
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Configure proxy settings if needed by creating a `.env` file in the project root with:

   ```env
   PROXY_USER=<username>
   PROXY_PASS=<password>
   ```

5. Start the backend:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Frontend Setup

1. Open a terminal in `frontend/`.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open the app in your browser at:

   ```text
   http://localhost:5173
   ```

## Usage

1. Start the backend and frontend.
2. Paste a YouTube video URL into the app.
3. Click `Build Index →`.
4. Wait for the transcript to be indexed.
5. Ask questions about the video using the chat interface.

## Notes

- The frontend expects the backend at `http://localhost:8000`.
- Embedded transcript text is stored in memory by default; the app does not persist the FAISS index across restarts.
- The first run downloads the `all-MiniLM-L6-v2` model locally (~80MB).

## Folder Structure

- `backend/`
  - `main.py` — FastAPI app and RAG pipeline.
  - `requirements.txt` — backend dependencies.
- `frontend/`
  - `package.json` — frontend dependencies and scripts.
  - `src/` — React components and app logic.

## Troubleshooting

- If transcript extraction fails, try a different public YouTube video with captions.
- If the app cannot connect, verify the backend is running on `http://localhost:8000`.
- If the frontend shows CORS issues, confirm the backend origin whitelist includes `http://localhost:5173`.

## License

This project does not include a license file. Add one if you want to share or distribute it.
