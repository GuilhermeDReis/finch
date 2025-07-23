/*
  # Create user_charts table for dashboard functionality

  1. New Tables
    - `user_charts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, chart name)
      - `category_id` (uuid, foreign key to categories)
      - `monthly_goal` (numeric, monthly spending goal)
      - `color` (text, chart color)
      - `period_months` (integer, analysis period)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_charts` table
    - Add policies for authenticated users to manage their own charts

  3. Constraints
    - Unique constraint on (user_id, name) to prevent duplicate chart names per user
    - Check constraint on period_months to allow only 6, 12, or 24
    - Check constraint on monthly_goal to ensure positive values
*/

CREATE TABLE IF NOT EXISTS user_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  monthly_goal numeric(12,2) NOT NULL CHECK (monthly_goal > 0),
  color text NOT NULL,
  period_months integer NOT NULL CHECK (period_months IN (6, 12, 24)),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, name)
);

-- Enable RLS
ALTER TABLE user_charts ENABLE ROW LEVEL SECURITY;

-- Policies for user_charts
CREATE POLICY "Users can view their own charts"
  ON user_charts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charts"
  ON user_charts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charts"
  ON user_charts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own charts"
  ON user_charts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_charts_updated_at
  BEFORE UPDATE ON user_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();