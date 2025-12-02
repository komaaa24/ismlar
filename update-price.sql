-- Update Basic plan price to 9 999 so'm va muddatni 1 yil (365 kun) qilish
UPDATE plans
SET price = 9999,
    duration = 365
WHERE name = 'Basic';

-- Verify update
SELECT id, name, price, duration FROM plans WHERE name = 'Basic';
