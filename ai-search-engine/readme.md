# 🔍 AgentSearchEngine

> An AI-powered research assistant that converges the web, Wikipedia, and Arxiv into a single intelligent search interface — built with LangChain agents and Groq's blazing-fast LLMs.

---

## ✨ What is AgentSearchEngine?

AgentSearchEngine is a multi-source AI search engine that uses a **ReAct agent** (Reason + Act) to intelligently decide which tool to use for each query — then synthesizes the results into a clean, conversational answer.

Ask it anything:
- *"Explain transformer architecture"* → pulls from Arxiv papers
- *"Who is Alan Turing?"* → queries Wikipedia
- *"Latest developments in LLM fine-tuning"* → searches the live web
- *"What is reinforcement learning from human feedback?"* → uses all three

---

## 🏗️ Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────┐
│         ReAct Agent             │
│     (LLaMA 3.3 via Groq)        │
│                                 │
│  Reason → Act → Observe → ...   │
└──────┬──────────────────────────┘
       │
       ├──────────────────────────────┐
       │                              │
       ▼                              ▼
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
│  Wikipedia  │   │    Arxiv     │   │  DuckDuckGo Web  │
│  (Factual)  │   │  (Research)  │   │  (Live Search)   │
└─────────────┘   └──────────────┘   └──────────────────┘
       │                  │                    │
       └──────────────────┴────────────────────┘
                          │
                          ▼
                  Synthesized Answer
                  (streamed to UI)
```

---

## 🚀 Features

- **Multi-tool ReAct Agent** — autonomously picks the right source per query
- **Three knowledge sources** — web (DuckDuckGo), encyclopedia (Wikipedia), research papers (Arxiv)
- **Streaming thought process** — watch the agent reason in real time via `StreamlitCallbackHandler`
- **Proxy-aware** — configurable HTTP proxy support for restricted networks
- **Graceful degradation** — if a tool is unavailable (e.g. network block), the agent falls back to other sources automatically
- **Conversation memory** — maintains chat history across turns in the session
- **Modern LangChain** — uses `create_react_agent` + `AgentExecutor` (no deprecated APIs)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| LLM | LLaMA 3.3 70B via [Groq](https://groq.com) |
| Agent Framework | LangChain `create_react_agent` |
| Web Search | DuckDuckGo (`ddgs`) |
| Encyclopedia | Wikipedia API |
| Research Papers | Arxiv API |
| UI | Streamlit |
| Env Management | python-dotenv |

---

## ⚙️ Setup

### 1. Clone the repo

```bash
git clone https://github.com/shruthipallemoni/agentsearchengine.git
cd agentsearchengine
```

### 2. Create and activate environment

```bash
conda create -n agentsearchengine python=3.10
conda activate agentsearchengine
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Get your free Groq API key at [console.groq.com](https://console.groq.com).

### 5. Run the app

```bash
streamlit run app.py
```

---

## 📦 Requirements

```txt
streamlit
langchain
langchain-groq
langchain-community
langchainhub
ddgs
wikipedia
arxiv
python-dotenv
```

---

## 🌐 Proxy Configuration (Restricted Networks)

If you're on a network that requires proxy authentication (e.g. college/university networks), add this to the top of `app.py`:

```python
import os

PROXY = "http://your-proxy-host:port"
# With credentials:
# PROXY = "http://username:password@your-proxy-host:port"

os.environ["HTTP_PROXY"] = PROXY
os.environ["HTTPS_PROXY"] = PROXY
os.environ["http_proxy"] = PROXY
os.environ["https_proxy"] = PROXY
```

This must be set **before any imports** that trigger HTTP calls.

> **Note:** If Wikipedia is blocked at the network level, AgentSearchEngine detects this and automatically falls back to DuckDuckGo and Arxiv — no crash, no interruption.

---

## 🖥️ Usage

1. Open the app at `http://localhost:8501`
2. Enter your **Groq API key** in the sidebar
3. Type any research question in the chat input
4. Watch the agent reason through which tools to use
5. Get a synthesized, cited answer

### Example queries

```
What is retrieval-augmented generation?
Explain the attention mechanism in transformers
Who invented the LSTM?
Latest research on vision-language models
What is LangGraph used for?
```

---

## 📁 Project Structure

```
agentsearchengine/
├── app.py              # Main Streamlit app + agent setup
├── .env                # API keys (not committed)
├── .env.example        # Template for environment variables
├── requirements.txt    # Python dependencies
└── README.md
```

---

## 🔧 Troubleshooting

| Issue | Cause | Fix |
|---|---|---|
| `JSONDecodeError` on Wikipedia | Network blocking Wikipedia API | Already handled — falls back automatically |
| `No good DuckDuckGo result` | Proxy throttling DDG API | Try `pip install ddgs --upgrade` |
| `LangSmithMissingAPIKeyWarning` | LangSmith tracing enabled by default | Set `LANGCHAIN_TRACING_V2=false` in `.env` |
| `407 Proxy Authentication Required` | Proxy needs credentials | Add `username:password@` to proxy URL |
| Agent loops without finishing | LLM parsing issue | Switch to `llama-3.3-70b-versatile` (handles ReAct format better) |

---

## 🗺️ Roadmap

- [ ] Add Tavily search as a more reliable web search backend
- [ ] Persistent conversation memory across sessions (LangGraph checkpointing)
- [ ] Source citations displayed alongside answers
- [ ] Deploy to Hugging Face Spaces
- [ ] Add PDF upload for document-grounded Q&A

---

## 👩‍💻 Author

**Shruthi Pallemoni**
- GitHub: [@shruthipallemoni](https://github.com/shruthipallemoni)
- Built as part of the [genai-projects](https://github.com/shruthipallemoni/genai-projects) portfolio

---

## 📄 License

MIT License — feel free to use, modify, and build on this project.