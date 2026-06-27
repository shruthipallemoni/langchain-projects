import os
from dotenv import load_dotenv

load_dotenv()

PROXY_URL = f"http://{os.getenv('PROXY_USER')}:{os.getenv('PROXY_PASS')}@hostelinternet.rgukt.ac.in:3128"
os.environ["HTTPS_PROXY"] = PROXY_URL
os.environ["HTTP_PROXY"]  = PROXY_URL   # ← these lines were MISSING
os.environ["HTTPS_PROXY"] = PROXY_URL
os.environ["http_proxy"]  = PROXY_URL
os.environ["https_proxy"] = PROXY_URL

import streamlit as st
from langchain_groq import ChatGroq
from langchain_community.utilities import WikipediaAPIWrapper, ArxivAPIWrapper
from langchain_community.tools import WikipediaQueryRun, ArxivQueryRun, DuckDuckGoSearchRun
from langchain import hub
from langchain.agents import create_react_agent, AgentExecutor
from langchain_community.callbacks.streamlit import StreamlitCallbackHandler
from langchain_core.tools import Tool


# --- Tool setup with safe Wikipedia wrapper ---
api_arxiv_wrapper = ArxivAPIWrapper(top_k_results=4, doc_content_chars_max=400)
arxiv = ArxivQueryRun(api_wrapper=api_arxiv_wrapper)

# Wrap Wikipedia to gracefully handle network errors
api_wiki_wrapper = WikipediaAPIWrapper(top_k_results=4, doc_content_chars_max=400)
_wiki_tool = WikipediaQueryRun(api_wrapper=api_wiki_wrapper)

def safe_wiki_run(query: str) -> str:
    try:
        return _wiki_tool.run(query)
    except Exception as e:
        return f"Wikipedia is unavailable on this network. Error: {type(e).__name__}"

wiki = Tool(
    name="Wikipedia",
    func=safe_wiki_run,
    description="Search Wikipedia for factual information about topics, people, events, etc."
)

search = DuckDuckGoSearchRun(name="Search")

# --- UI ---
st.sidebar.title("Configuration")
api_key = st.sidebar.text_input("Enter the Groq API Key", type="password")

st.title("Langchain AI Search Engine")

if "messages" not in st.session_state:
    st.session_state["messages"] = [
        {"role": "assistant", "content": "Hi, I'm a helpful assistant who can search the web, Wikipedia, and Arxiv for you!"}
    ]

for msg in st.session_state["messages"]:
    st.chat_message(msg["role"]).write(msg["content"])

if prompt := st.chat_input(placeholder="What is machine learning?"):
    st.session_state.messages.append({"role": "user", "content": prompt})
    st.chat_message("user").write(prompt)

    if not api_key:
        st.warning("Please enter your Groq API key in the sidebar.")
        st.stop()

    llm = ChatGroq(groq_api_key=api_key, model_name="llama-3.3-70b-versatile", temperature=0.2)
    tools = [arxiv, wiki, search]

    # Modern agent setup (replaces deprecated initialize_agent)
    prompt_template = hub.pull("hwchase17/react-chat")
    agent = create_react_agent(llm, tools, prompt_template)
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        handle_parsing_errors=True,
        verbose=True
    )

    with st.chat_message("assistant"):
        st_cb = StreamlitCallbackHandler(st.container(), expand_new_thoughts=False)
        response = agent_executor.invoke(
            {
                "input": prompt,
                "chat_history": st.session_state.messages[:-1]  # exclude latest user msg
            },
            {"callbacks": [st_cb]}
        )["output"]
        st.session_state.messages.append({"role": "assistant", "content": response})  # fixed typo
        st.write(response)