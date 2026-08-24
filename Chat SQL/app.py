import sqlite3
import streamlit as st
from pathlib import Path
from langchain.agents import create_sql_agent
from langchain.sql_database import SQLDatabase
from langchain.agents.agent_types import AgentType
from langchain.callbacks import StreamlitCallbackHandler
from langchain.agents.agent_toolkits import SQLDatabaseToolkit
from sqlalchemy import create_engine
from langchain_groq import ChatGroq
from dotenv import load_dotenv
load_dotenv()
import pandas as pd
from urllib.parse import quote_plus

st.set_page_config(page_title="Langchain : Chat with SQL DB")
st.title("Langchain : Chat with SQL DB")

LOCALDB="LOCAL"
MYSQL="MYSQL"

radio_opt=["Use SQLite3 Database(student.db)","Connect to you SQL Database"]
selected_opt=st.sidebar.radio(label="Choose the DB which you want to chat",options=radio_opt)

if radio_opt.index(selected_opt)==1:
    db_url=MYSQL
    mysql_host=st.sidebar.text_input("Provide MySQL Host")
    mysql_user=st.sidebar.text_input("MYSQL User")
    mysql_password=st.sidebar.text_input("MYSQL password",type="password")
    mysql_db=st.sidebar.text_input("MySQL database")
else:
    db_url=LOCALDB

api_key=st.sidebar.text_input(label="Enter Groq API Key",type="password")

if not db_url:
    st.info("Please Enter the database information and uri")

if not api_key:
    st.info("Please add the groq api key")
    st.stop()

##LLM model 
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    api_key=api_key,
    temperature=0.2,
)

@st.cache_resource(ttl="2h")
def configure_db(db_url,mysql_host=None,mysql_user=None,mysql_password=None,mysql_db=None):
    if db_url==LOCALDB:
        db_file_path=(Path(__file__).parent/"student.db").absolute()
        print(db_file_path)

        creator=lambda:sqlite3.connect(f"file:{db_file_path}?mode=ro",uri=True)
        return SQLDatabase(create_engine("sqlite://",creator=creator))
    

    elif db_url==MYSQL:
        if not (mysql_host and mysql_user and mysql_password and mysql_db):
            st.error("Please provide all MySQL connection details.")
            st.stop()
        encoded_password = quote_plus(mysql_password)
        return SQLDatabase(create_engine(f"mysql+mysqlconnector://{mysql_user}:{encoded_password}@{mysql_host}/{mysql_db}"))
    

if db_url==MYSQL:
    db=configure_db(db_url,mysql_host,mysql_user,mysql_password,mysql_db)
else:
    db=configure_db(db_url)

#Toolkit
toolkit=SQLDatabaseToolkit(db=db,llm=llm)
agent=create_sql_agent(
    llm=llm,
    toolkit=toolkit,
    verbose=True,
    agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION
)

if "messages" not in st.session_state or st.sidebar.button("Clear message history"):
    st.session_state["messages"]=[{"role":"assistant","content":"How can I help you ?"}]

for msg in st.session_state.messages:
    st.chat_message(msg["role"]).write(msg["content"])

user_query=st.chat_input(placeholder="Ask anything from the database")

if user_query:
    st.session_state.messages.append({"role":"user","content":user_query})
    st.chat_message("user").write(user_query)

    with st.chat_message("assistant"):
        streamlit_callback=StreamlitCallbackHandler(st.container())
        response = agent.invoke({"input": user_query},{"callbacks": [streamlit_callback]})
        st.session_state.messages.append({"role":"assistant","content":response["output"]})
        st.write(response["output"])


uploaded_file=st.file_uploader(
    "Upload CSV",
    type=["csv"]
)

if uploaded_file is not None:
    df=pd.read_csv(uploaded_file)
    st.write(df.head())

    with sqlite3.connect("temp.db") as conn:
        df.to_sql(
            name=uploaded_file.name.split(".")[0],
            con=conn,
            if_exists="replace",
            index=False
        )
        
        cursor=conn.cursor()

        cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table';"
         )
   
else:
    st.write("Please Upload a CSV File")

