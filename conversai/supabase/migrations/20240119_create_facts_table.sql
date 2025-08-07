-- Create enum for fact categories
CREATE TYPE fact_category AS ENUM (
  'identity',
  'location', 
  'relationships',
  'preferences',
  'activities',
  'history',
  'goals',
  'context'
);

-- Create facts table
CREATE TABLE facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category fact_category NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  access_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Ensure unique key per user
  UNIQUE(user_id, key)
);

-- Create indexes for performance
CREATE INDEX idx_facts_user_id ON facts(user_id);
CREATE INDEX idx_facts_category ON facts(category);
CREATE INDEX idx_facts_key ON facts(key);
CREATE INDEX idx_facts_confidence ON facts(confidence DESC);
CREATE INDEX idx_facts_updated_at ON facts(updated_at DESC);

-- Create GIN index for full text search on value and raw_text
CREATE INDEX idx_facts_search ON facts USING GIN (
  to_tsvector('english', value || ' ' || raw_text)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_facts_updated_at 
  BEFORE UPDATE ON facts 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();

-- Function to increment access count
CREATE OR REPLACE FUNCTION increment_fact_access_count(fact_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE facts 
  SET access_count = access_count + 1 
  WHERE id = fact_id;
END;
$$ language 'plpgsql';

-- Row Level Security (RLS)
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own facts
CREATE POLICY "Users can view own facts" ON facts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own facts" ON facts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own facts" ON facts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own facts" ON facts
  FOR DELETE USING (auth.uid() = user_id);

-- Function to upsert facts (update if exists with higher confidence)
CREATE OR REPLACE FUNCTION upsert_fact(
  p_user_id UUID,
  p_category fact_category,
  p_key TEXT,
  p_value TEXT,
  p_raw_text TEXT,
  p_confidence DECIMAL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS facts AS $$
DECLARE
  v_existing_fact facts;
  v_result facts;
BEGIN
  -- Check if fact exists
  SELECT * INTO v_existing_fact
  FROM facts
  WHERE user_id = p_user_id AND key = p_key;
  
  IF v_existing_fact.id IS NOT NULL THEN
    -- Update only if new confidence is higher
    IF p_confidence > v_existing_fact.confidence THEN
      UPDATE facts
      SET 
        value = p_value,
        raw_text = p_raw_text,
        confidence = p_confidence,
        category = p_category,
        metadata = jsonb_build_object(
          'supersedes', v_existing_fact.id,
          'previous_value', v_existing_fact.value,
          'previous_confidence', v_existing_fact.confidence
        ) || p_metadata,
        updated_at = TIMEZONE('utc', NOW())
      WHERE id = v_existing_fact.id
      RETURNING * INTO v_result;
    ELSE
      -- Return existing fact if confidence is not higher
      v_result := v_existing_fact;
    END IF;
  ELSE
    -- Insert new fact
    INSERT INTO facts (user_id, category, key, value, raw_text, confidence, metadata)
    VALUES (p_user_id, p_category, p_key, p_value, p_raw_text, p_confidence, p_metadata)
    RETURNING * INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search facts by keywords
CREATE OR REPLACE FUNCTION search_facts(
  p_user_id UUID,
  p_keywords TEXT[],
  p_categories fact_category[] DEFAULT NULL,
  p_min_confidence DECIMAL DEFAULT 0.0,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF facts AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT f.*
  FROM facts f
  WHERE f.user_id = p_user_id
    AND f.confidence >= p_min_confidence
    AND (p_categories IS NULL OR f.category = ANY(p_categories))
    AND (
      p_keywords IS NULL 
      OR EXISTS (
        SELECT 1 
        FROM unnest(p_keywords) AS keyword
        WHERE 
          f.value ILIKE '%' || keyword || '%'
          OR f.raw_text ILIKE '%' || keyword || '%'
          OR f.key ILIKE '%' || keyword || '%'
      )
    )
  ORDER BY f.confidence DESC, f.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get facts by categories
CREATE OR REPLACE FUNCTION get_facts_by_categories(
  p_user_id UUID,
  p_categories fact_category[],
  p_min_confidence DECIMAL DEFAULT 0.0,
  p_limit INTEGER DEFAULT 100
)
RETURNS SETOF facts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM facts
  WHERE user_id = p_user_id
    AND category = ANY(p_categories)
    AND confidence >= p_min_confidence
  ORDER BY confidence DESC, updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get fact summary for a user
CREATE OR REPLACE FUNCTION get_fact_summary(p_user_id UUID)
RETURNS TABLE (
  total_facts BIGINT,
  category fact_category,
  category_count BIGINT,
  avg_confidence DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH category_stats AS (
    SELECT 
      category,
      COUNT(*) as category_count,
      AVG(confidence) as avg_confidence
    FROM facts
    WHERE user_id = p_user_id
    GROUP BY category
  ),
  total_stats AS (
    SELECT COUNT(*) as total_facts
    FROM facts
    WHERE user_id = p_user_id
  )
  SELECT 
    t.total_facts,
    c.category,
    c.category_count,
    c.avg_confidence
  FROM category_stats c
  CROSS JOIN total_stats t
  ORDER BY c.category_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;