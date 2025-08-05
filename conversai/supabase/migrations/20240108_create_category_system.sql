-- Create memory_categories table for intelligent categorization
CREATE TABLE IF NOT EXISTS memory_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('primary', 'sub', 'general')),
  fact_count INTEGER DEFAULT 0,
  facts JSONB DEFAULT '[]'::jsonb,
  themes TEXT[] DEFAULT '{}',
  summary TEXT,
  
  -- Evolution tracking
  parent_id UUID REFERENCES memory_categories(id) ON DELETE SET NULL,
  split_from UUID REFERENCES memory_categories(id) ON DELETE SET NULL,
  merged_from UUID[],
  
  -- Metrics for evolution decisions
  cohesion_score FLOAT DEFAULT 0.0,
  last_access_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create category_embeddings table for semantic search
CREATE TABLE IF NOT EXISTS category_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES memory_categories(id) ON DELETE CASCADE NOT NULL,
  embedding vector(1536),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'summary',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_memory_categories_user_id ON memory_categories(user_id);
CREATE INDEX idx_memory_categories_type ON memory_categories(type);
CREATE INDEX idx_memory_categories_fact_count ON memory_categories(fact_count);
CREATE INDEX idx_category_embeddings_category_id ON category_embeddings(category_id);

-- Create RLS policies
ALTER TABLE memory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_embeddings ENABLE ROW LEVEL SECURITY;

-- Memory categories policies
CREATE POLICY "Users can view their own categories"
  ON memory_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON memory_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON memory_categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON memory_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Category embeddings policies
CREATE POLICY "Users can view embeddings for their categories"
  ON category_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memory_categories
      WHERE memory_categories.id = category_embeddings.category_id
      AND memory_categories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create embeddings for their categories"
  ON category_embeddings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memory_categories
      WHERE memory_categories.id = category_embeddings.category_id
      AND memory_categories.user_id = auth.uid()
    )
  );

-- Function to update category metrics
CREATE OR REPLACE FUNCTION update_category_metrics()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.fact_count = jsonb_array_length(NEW.facts);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updating metrics
CREATE TRIGGER update_memory_categories_metrics
  BEFORE UPDATE ON memory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_metrics();

-- Function to track category access
CREATE OR REPLACE FUNCTION track_category_access()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE memory_categories
  SET 
    last_access_at = NOW(),
    access_count = access_count + 1
  WHERE id = NEW.category_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Example: Initialize general category for new users
CREATE OR REPLACE FUNCTION initialize_user_categories()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO memory_categories (user_id, name, type, facts, themes)
  VALUES (
    NEW.id,
    'General Knowledge',
    'general',
    '[]'::jsonb,
    '{}'::text[]
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Auto-initialize categories for new users
-- CREATE TRIGGER create_initial_categories
--   AFTER INSERT ON auth.users
--   FOR EACH ROW
--   EXECUTE FUNCTION initialize_user_categories();