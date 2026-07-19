-- Data Correction Migration: Fix Historical COGS Entries

-- 1. Find the Account IDs
-- DO NOT RUN BLINDLY. Confirm the actual UUIDs in your production database first if not running the python script.
-- SELECT id, code, name FROM accounts WHERE code IN ('5000', '5010');

-- Assuming 5000 is Purchase Returns and 5010 is Cost of Goods Sold.
-- Replace the IDs below with your actual database UUIDs.

UPDATE journal_entry_lines 
SET account_id = (SELECT id FROM accounts WHERE code = '5010' LIMIT 1)
WHERE account_id = (SELECT id FROM accounts WHERE code = '5000' LIMIT 1)
  AND journal_entry_id IN (
      SELECT id FROM journal_entries 
      WHERE description LIKE '%Auto Post: Cost of Goods Sold%'
  );
