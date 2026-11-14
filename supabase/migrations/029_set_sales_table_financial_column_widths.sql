-- Set the default financial column widths for existing saved table settings.
-- Set the default table column widths for every user's saved settings.
-- Other settings and unrelated column-width keys remain intact.
-- The update is idempotent, so reapplying this migration is safe.

UPDATE public.sales_settings
SET settings = settings || jsonb_build_object(
    'tableColumnWidths',
    (
        CASE
            WHEN jsonb_typeof(settings -> 'tableColumnWidths') = 'object'
                THEN settings -> 'tableColumnWidths'
            ELSE '{}'::jsonb
        END
    ) || jsonb_build_object(
        'subtotal', 130,
        'cost', 130,
        'sales', 130,
        'payment_status', 145
    )
)
WHERE settings IS NOT NULL;
