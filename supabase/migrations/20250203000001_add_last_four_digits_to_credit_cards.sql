-- Add last_four_digits column to credit_cards table
ALTER TABLE credit_cards 
ADD COLUMN last_four_digits VARCHAR(4);

-- Add comment to the column
COMMENT ON COLUMN credit_cards.last_four_digits IS 'Last four digits of the credit card for identification purposes';
