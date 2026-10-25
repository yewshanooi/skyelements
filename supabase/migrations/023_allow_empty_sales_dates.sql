-- Allow sales records to have no date when a user clears the date field.
ALTER TABLE public.sales ALTER COLUMN date DROP NOT NULL;
