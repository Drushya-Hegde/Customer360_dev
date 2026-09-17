CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS customer_embedding (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customer(id),
  source_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_embedding_customer ON customer_embedding(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_embedding_vector ON customer_embedding USING hnsw (embedding vector_cosine_ops);
