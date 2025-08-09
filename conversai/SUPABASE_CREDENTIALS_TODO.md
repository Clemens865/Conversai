# ⚠️ IMPORTANT: Complete Your Supabase Database URL

## Current Status
✅ Supabase URL configured
✅ Anon Key configured  
✅ Service Key configured
❌ Database password missing in connection string

## Action Required

1. **Get your database password**:
   - Go to: https://supabase.com/dashboard/project/mjwztzhdefgfgedyynzc/settings/database
   - Find your database password (the one you created when setting up the project)
   - If you forgot it, you can reset it in the Database Settings

2. **Update .env.local**:
   Replace `[YOUR-DB-PASSWORD]` in line 29 with your actual password:
   ```
   CONVERSAI_SUPABASE_DB_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.mjwztzhdefgfgedyynzc.supabase.co:5432/postgres
   ```

3. **Run the SQL migrations**:
   - Go to: https://supabase.com/dashboard/project/mjwztzhdefgfgedyynzc/sql/new
   - Copy and paste the contents of `/conversai/supabase/migrations/001_setup_rag_tables.sql`
   - Click "Run" to create the tables

4. **Create storage bucket**:
   - Go to: https://supabase.com/dashboard/project/mjwztzhdefgfgedyynzc/storage/buckets
   - Create new bucket named: `conversai-documents`
   - Set as Private

## Verify Setup

Once you've added the database password, test the connection:

```bash
cd conversai/rag-service
cargo run

# In another terminal:
curl http://localhost:3030/health
```

If it returns OK, your setup is complete!