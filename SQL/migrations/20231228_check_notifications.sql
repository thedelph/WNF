-- Check notifications table schema
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
