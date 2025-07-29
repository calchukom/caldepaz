-- Migration: Add payment metadata fields
-- This migration adds the missing fields to the payments table

-- Add failure_reason column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'failure_reason') THEN
        ALTER TABLE "payments" ADD COLUMN "failure_reason" text;
    END IF;
END $$;

-- Add metadata column if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'payments' AND column_name = 'metadata') THEN
        ALTER TABLE "payments" ADD COLUMN "metadata" text;
    END IF;
END $$;
