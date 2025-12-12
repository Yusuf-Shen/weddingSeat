-- Create seating_plans table to store seat assignment plans
CREATE TABLE IF NOT EXISTS seating_plans (
  id VARCHAR(36) PRIMARY KEY,
  tables JSONB NOT NULL,
  guests JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on id for faster lookups
CREATE INDEX IF NOT EXISTS idx_seating_plans_id ON seating_plans(id);
