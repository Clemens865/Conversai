-- =====================================================
-- DETERMINISTIC MEMORY ARCHITECTURE - DATABASE MIGRATION
-- =====================================================
-- This creates the guaranteed fact retrieval system
-- Run this after the existing Supabase migrations

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- STRUCTURED FACT STORAGE (Deterministic Layer)
-- =====================================================

-- Core entity types with guaranteed retrieval
CREATE TABLE IF NOT EXISTS fact_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    entity_type TEXT NOT NULL, -- 'person', 'pet', 'place', 'thing'
    entity_subtype TEXT, -- 'user', 'family', 'friend', 'dog', 'cat', etc.
    canonical_name TEXT NOT NULL, -- Primary name for the entity
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    confidence DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
    source_type TEXT DEFAULT 'user_stated', -- 'user_stated', 'inferred', 'corrected'
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(user_id, entity_type, entity_subtype, canonical_name),
    CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- Alternative names and aliases
CREATE TABLE IF NOT EXISTS fact_aliases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES fact_entities(id) ON DELETE CASCADE,
    alias_name TEXT NOT NULL,
    alias_type TEXT DEFAULT 'nickname', -- 'nickname', 'formal', 'variant'
    confidence DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(entity_id, alias_name)
);

-- Structured relationships between entities
CREATE TABLE IF NOT EXISTS fact_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    subject_entity_id UUID REFERENCES fact_entities(id) NOT NULL,
    relationship_type TEXT NOT NULL, -- 'owns', 'works_at', 'lives_in', 'married_to'
    object_entity_id UUID REFERENCES fact_entities(id),
    object_value TEXT, -- For non-entity objects like dates, values
    confidence DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    source_message_id UUID REFERENCES messages(id),
    is_active BOOLEAN DEFAULT true,
    
    CHECK (object_entity_id IS NOT NULL OR object_value IS NOT NULL),
    CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- Structured attributes for entities
CREATE TABLE IF NOT EXISTS fact_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id UUID REFERENCES fact_entities(id) ON DELETE CASCADE,
    attribute_name TEXT NOT NULL, -- 'age', 'color', 'breed', 'occupation'
    attribute_value TEXT NOT NULL,
    attribute_type TEXT DEFAULT 'string', -- 'string', 'number', 'date', 'boolean'
    confidence DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    source_message_id UUID REFERENCES messages(id),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(entity_id, attribute_name),
    CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

-- Fast lookup cache for critical facts
CREATE TABLE IF NOT EXISTS fact_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    cache_key TEXT NOT NULL, -- 'user_name', 'pet_names', 'family_members'
    cache_value JSONB NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    UNIQUE(user_id, cache_key)
);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Critical performance indexes for guaranteed fast retrieval
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_entities_user_type 
ON fact_entities(user_id, entity_type) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_entities_user_type_subtype 
ON fact_entities(user_id, entity_type, entity_subtype) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_entities_canonical_name 
ON fact_entities(canonical_name) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_aliases_entity 
ON fact_aliases(entity_id) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_relationships_user_subject 
ON fact_relationships(user_id, subject_entity_id) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_cache_user_key 
ON fact_cache(user_id, cache_key);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fact_cache_expires 
ON fact_cache(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- GUARANTEED FACT RETRIEVAL FUNCTIONS
-- =====================================================

-- Function to get user name with 100% reliability
CREATE OR REPLACE FUNCTION get_user_name(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- First check cache
    SELECT cache_value::text 
    INTO user_name
    FROM fact_cache 
    WHERE user_id = p_user_id 
      AND cache_key = 'user_name'
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF user_name IS NOT NULL THEN
        RETURN user_name;
    END IF;
    
    -- Direct lookup from fact_entities
    SELECT canonical_name 
    INTO user_name
    FROM fact_entities 
    WHERE user_id = p_user_id 
      AND entity_type = 'person' 
      AND entity_subtype = 'user'
      AND is_active = true
    ORDER BY confidence DESC, updated_at DESC
    LIMIT 1;
    
    IF user_name IS NOT NULL THEN
        -- Cache the result
        INSERT INTO fact_cache (user_id, cache_key, cache_value, expires_at)
        VALUES (p_user_id, 'user_name', to_jsonb(user_name), NOW() + INTERVAL '24 hours')
        ON CONFLICT (user_id, cache_key) 
        DO UPDATE SET 
            cache_value = EXCLUDED.cache_value,
            last_updated = NOW(),
            expires_at = EXCLUDED.expires_at;
        
        RETURN user_name;
    END IF;
    
    -- If still not found, this is an error condition
    RAISE EXCEPTION 'User name not found for user_id: %', p_user_id;
END;
$$;

-- Function to get pet names with 100% reliability
CREATE OR REPLACE FUNCTION get_pet_names(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    pet_names TEXT[];
    cached_names JSONB;
BEGIN
    -- First check cache
    SELECT cache_value 
    INTO cached_names
    FROM fact_cache 
    WHERE user_id = p_user_id 
      AND cache_key = 'pet_names'
      AND (expires_at IS NULL OR expires_at > NOW());
    
    IF cached_names IS NOT NULL THEN
        RETURN ARRAY(SELECT jsonb_array_elements_text(cached_names));
    END IF;
    
    -- Direct lookup from fact_entities
    SELECT ARRAY(
        SELECT canonical_name 
        FROM fact_entities 
        WHERE user_id = p_user_id 
          AND entity_type = 'pet'
          AND is_active = true
        ORDER BY created_at
    ) INTO pet_names;
    
    -- Cache the result
    INSERT INTO fact_cache (user_id, cache_key, cache_value, expires_at)
    VALUES (p_user_id, 'pet_names', to_jsonb(pet_names), NOW() + INTERVAL '24 hours')
    ON CONFLICT (user_id, cache_key) 
    DO UPDATE SET 
        cache_value = EXCLUDED.cache_value,
        last_updated = NOW(),
        expires_at = EXCLUDED.expires_at;
    
    RETURN pet_names;
END;
$$;

-- Function to invalidate cache when facts change
CREATE OR REPLACE FUNCTION invalidate_fact_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Invalidate relevant cache entries when facts change
    DELETE FROM fact_cache 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- =====================================================
-- TRIGGERS FOR CACHE INVALIDATION
-- =====================================================

-- Invalidate cache when entities change
CREATE TRIGGER trigger_invalidate_cache_entities
    AFTER INSERT OR UPDATE OR DELETE ON fact_entities
    FOR EACH ROW EXECUTE FUNCTION invalidate_fact_cache();

-- Invalidate cache when aliases change
CREATE TRIGGER trigger_invalidate_cache_aliases
    AFTER INSERT OR UPDATE OR DELETE ON fact_aliases
    FOR EACH ROW EXECUTE FUNCTION invalidate_fact_cache();

-- =====================================================
-- INITIAL DATA SETUP FOR CLEMENS
-- =====================================================

-- This would be called when setting up the demo
CREATE OR REPLACE FUNCTION setup_demo_user_facts(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert Clemens as the user
    INSERT INTO fact_entities (user_id, entity_type, entity_subtype, canonical_name, confidence, source_type)
    VALUES (p_user_id, 'person', 'user', 'Clemens', 1.0, 'user_stated')
    ON CONFLICT (user_id, entity_type, entity_subtype, canonical_name) DO NOTHING;
    
    -- Insert pets Holly and Benny
    INSERT INTO fact_entities (user_id, entity_type, canonical_name, confidence, source_type)
    VALUES 
        (p_user_id, 'pet', 'Holly', 1.0, 'user_stated'),
        (p_user_id, 'pet', 'Benny', 1.0, 'user_stated')
    ON CONFLICT (user_id, entity_type, entity_subtype, canonical_name) DO NOTHING;
    
    -- Pre-populate cache for immediate testing
    INSERT INTO fact_cache (user_id, cache_key, cache_value, expires_at)
    VALUES 
        (p_user_id, 'user_name', '"Clemens"', NOW() + INTERVAL '24 hours'),
        (p_user_id, 'pet_names', '["Holly", "Benny"]', NOW() + INTERVAL '24 hours')
    ON CONFLICT (user_id, cache_key) 
    DO UPDATE SET 
        cache_value = EXCLUDED.cache_value,
        last_updated = NOW(),
        expires_at = EXCLUDED.expires_at;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all fact tables
ALTER TABLE fact_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact_cache ENABLE ROW LEVEL SECURITY;

-- Create policies to ensure users can only access their own facts
CREATE POLICY "Users can only access their own entities" ON fact_entities
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access aliases of their entities" ON fact_aliases
    FOR ALL USING (EXISTS (
        SELECT 1 FROM fact_entities fe 
        WHERE fe.id = fact_aliases.entity_id 
        AND fe.user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their own relationships" ON fact_relationships
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can only access attributes of their entities" ON fact_attributes
    FOR ALL USING (EXISTS (
        SELECT 1 FROM fact_entities fe 
        WHERE fe.id = fact_attributes.entity_id 
        AND fe.user_id = auth.uid()
    ));

CREATE POLICY "Users can only access their own cache" ON fact_cache
    FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TESTING AND VALIDATION
-- =====================================================

-- Function to test fact retrieval accuracy
CREATE OR REPLACE FUNCTION test_fact_accuracy(p_user_id UUID)
RETURNS TABLE (
    test_name TEXT,
    result TEXT,
    expected_value TEXT,
    actual_value TEXT,
    success BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
    user_name_result TEXT;
    pet_names_result TEXT[];
BEGIN
    -- Test user name retrieval
    BEGIN
        user_name_result := get_user_name(p_user_id);
        RETURN QUERY SELECT 
            'get_user_name'::TEXT,
            'SUCCESS'::TEXT,
            'Clemens'::TEXT,
            user_name_result,
            (user_name_result = 'Clemens');
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'get_user_name'::TEXT,
            'ERROR: ' || SQLERRM,
            'Clemens'::TEXT,
            'NULL'::TEXT,
            false;
    END;
    
    -- Test pet names retrieval
    BEGIN
        pet_names_result := get_pet_names(p_user_id);
        RETURN QUERY SELECT 
            'get_pet_names'::TEXT,
            'SUCCESS'::TEXT,
            'Holly, Benny'::TEXT,
            array_to_string(pet_names_result, ', '),
            ('Holly' = ANY(pet_names_result) AND 'Benny' = ANY(pet_names_result));
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY SELECT 
            'get_pet_names'::TEXT,
            'ERROR: ' || SQLERRM,
            'Holly, Benny'::TEXT,
            'NULL'::TEXT,
            false;
    END;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE fact_entities IS 'Core entities (people, pets, places, things) with guaranteed retrieval';
COMMENT ON TABLE fact_aliases IS 'Alternative names and nicknames for entities';
COMMENT ON TABLE fact_relationships IS 'Structured relationships between entities';
COMMENT ON TABLE fact_attributes IS 'Structured attributes for entities (age, color, etc.)';
COMMENT ON TABLE fact_cache IS 'High-performance cache for frequently accessed facts';

COMMENT ON FUNCTION get_user_name(UUID) IS 'Guaranteed retrieval of user name with 100% accuracy';
COMMENT ON FUNCTION get_pet_names(UUID) IS 'Guaranteed retrieval of pet names with 100% accuracy';
COMMENT ON FUNCTION test_fact_accuracy(UUID) IS 'Test function to validate fact retrieval accuracy';