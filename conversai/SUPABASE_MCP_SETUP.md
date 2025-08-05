# Supabase MCP Server Setup

## Overview
The Supabase MCP (Model Context Protocol) server allows Claude to directly interact with your Supabase database, execute SQL queries, manage tables, and perform other database operations.

## Setup Instructions

### 1. Get Your Supabase Access Token

1. Go to your [Supabase Dashboard](https://app.supabase.com)
2. Click on your profile avatar (top right)
3. Select "Access Tokens"
4. Click "Generate new token"
5. Give it a name (e.g., "ConversAI MCP")
6. Copy the generated token

### 2. Update MCP Configuration

Replace `YOUR_SUPABASE_ACCESS_TOKEN` in `.mcp.json` with your actual token:

```json
"supabase": {
  "command": "npx",
  "args": [
    "-y",
    "@supabase/mcp-server-supabase@latest",
    "--access-token",
    "YOUR_ACTUAL_TOKEN_HERE"
  ]
}
```

### 3. Restart Claude

After updating the configuration:
1. Quit Claude completely
2. Restart Claude
3. The Supabase MCP server will be available

## Available MCP Commands

Once configured, you can use commands like:
- `mcp__supabase__execute_sql` - Execute SQL queries
- `mcp__supabase__list_tables` - List all tables
- `mcp__supabase__describe_table` - Get table schema
- And more database operations

## Security Note

⚠️ **Important**: Never commit your access token to version control. The `.mcp.json` file is already in `.gitignore`.

## Using the MCP in This Project

With the Supabase MCP configured, we can:
1. Create database tables directly
2. Run migrations
3. Query data
4. Manage database schema
5. Execute any SQL operations

This eliminates the need to manually run SQL in the Supabase dashboard.