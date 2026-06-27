# Remove this import:
# from langchain_community.embeddings import HuggingFaceEmbeddings

# Add this instead:
from langchain_community.embeddings import FastEmbedEmbeddings

# Replace the embeddings initialization:
print("Loading embedding model...")
embeddings = FastEmbedEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
    # Only ~23MB, uses ~100MB RAM — fits comfortably in 512MB
    # Actually better quality than MiniLM for retrieval tasks
)
print("Embedding model loaded.")