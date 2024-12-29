-- Check current enum values
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname = 'notification_type'
ORDER BY e.enumsortorder;
