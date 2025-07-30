-- SQL script to check categories and subcategories in the database
-- Run this in the Supabase SQL editor to see what data exists

-- Check all categories
SELECT 'CATEGORIES' as table_name, id, name, type, color, created_at 
FROM categories 
ORDER BY type, name;

-- Check all subcategories
SELECT 'SUBCATEGORIES' as table_name, id, name, category_id, created_at 
FROM subcategories 
ORDER BY name;

-- Count of categories by type
SELECT 
    'CATEGORY_COUNTS' as info,
    type, 
    COUNT(*) as count 
FROM categories 
GROUP BY type;

-- Check if there are any user_charts already
SELECT 'EXISTING_CHARTS' as table_name, id, name, category_id, user_id, created_at 
FROM user_charts 
LIMIT 5;

-- Verify foreign key constraints
SELECT 
    'CONSTRAINTS' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'user_charts'::regclass 
AND contype = 'f';  -- foreign key constraints
