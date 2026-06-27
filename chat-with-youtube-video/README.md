# YouTube Video Q&A with RAG

A modern web application that lets users ask questions about a YouTube video using a Retrieval-Augmented Generation (RAG) pipeline. The app extracts a video transcript, indexes it semantically, and answers questions with the help of a large language model.

Live demo: https://langchain-projects-liart.vercel.app/

## Overview

This project consists of two main parts:

- Backend: a FastAPI service that extracts YouTube transcripts, splits them into meaningful chunks, creates embeddings, and serves RAG-based answers.
- Frontend: a React + Vite application that provides a simple interface for entering a YouTube URL, loading the video, and chatting with the AI assistant.

## Features

- Paste a YouTube video URL
- Extract transcript content automatically
- Build a semantic vector index for the video
- Ask questions about the video in natural language
- Stream AI-generated answers in the chat interface
- Deployable frontend and backend for production use

## Tech Stack

### Backend
- Python
- FastAPI
- LangChain
- Hugging Face embeddings
- FAISS
- Groq LLM
- youtube-transcript-api

### Frontend
- React
- Vite
- JavaScript / JSX
- CSS

## Project Structure

```text
chat-with-youtube-video/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── runtime.txt
└── frontend/
    ├── src/
    ├── package.json
    └── vite.config.js
```

## Prerequisites

- Python 3.10 or newer
- Node.js 18+ and npm
- Access to a public YouTube video with captions enabled

## Backend Setup

1. Navigate to the backend folder:

```bash
cd backend
```

2. Create and activate a virtual environment:

```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

3. Install the required Python dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file if needed and add environment variables such as:

```env
GROQ_API_KEY=your_groq_api_key
PROXY_USER=your_proxy_username
PROXY_PASS=your_proxy_password
```

5. Start the backend server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Frontend Setup

1. Navigate to the frontend folder:

```bash
cd frontend
```

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

## Deployment

The frontend is currently deployed at:

https://langchain-projects-liart.vercel.app/

The backend is deployed separately and should be configured to communicate with the frontend through the correct API URL.

## Usage

1. Open the web app.
2. Paste a YouTube video URL.
3. Load the video to build its index.
4. Ask questions about the content and receive AI-generated responses.

## Notes

- Transcript access depends on YouTube availability and caption support.
- The app uses in-memory storage for the generated vector index during the current session.
- The first run may download the embedding model locally, which can take some time.

## License

This project is currently unlicensed. Add a license file if you want to distribute or reuse it publicly.
