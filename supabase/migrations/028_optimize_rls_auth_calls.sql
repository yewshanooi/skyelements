-- Evaluate auth.uid() once per statement instead of once per row in RLS
-- policies, following Supabase's RLS performance guidance.

ALTER POLICY "Users can view their own notes" ON public.notes
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can create their own notes" ON public.notes
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own notes" ON public.notes
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete their own notes" ON public.notes
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own sales options" ON public.sales_options
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert their own sales options" ON public.sales_options
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own sales options" ON public.sales_options
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete their own sales options" ON public.sales_options
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own sales" ON public.sales
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert their own sales" ON public.sales
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own sales" ON public.sales
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete their own sales" ON public.sales
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can manage their own ai_chats" ON public.ai_chats
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can manage messages in their ai_chats" ON public.ai_messages
  USING (EXISTS (
    SELECT 1
    FROM public.ai_chats AS c
    WHERE c.id = ai_messages.chat_id
      AND c.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.ai_chats AS c
    WHERE c.id = ai_messages.chat_id
      AND c.user_id = (SELECT auth.uid())
  ));
ALTER POLICY "Users can manage their ai_attachments" ON public.ai_attachments
  USING (EXISTS (
    SELECT 1
    FROM public.ai_messages AS m
    JOIN public.ai_chats AS c ON c.id = m.chat_id
    WHERE m.id = ai_attachments.message_id
      AND c.user_id = (SELECT auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.ai_messages AS m
    JOIN public.ai_chats AS c ON c.id = m.chat_id
    WHERE m.id = ai_attachments.message_id
      AND c.user_id = (SELECT auth.uid())
  ));

ALTER POLICY "Users can view their own sales settings" ON public.sales_settings
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert their own sales settings" ON public.sales_settings
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own sales settings" ON public.sales_settings
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can delete their own sales settings" ON public.sales_settings
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own sales AI insights" ON public.sales_ai_insights
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can insert their own sales AI insights" ON public.sales_ai_insights
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update their own sales AI insights" ON public.sales_ai_insights
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can view their own AI usage" ON public.ai_user_daily_usage
  USING ((SELECT auth.uid()) = user_id);

-- This standalone index is not used by application queries.
DROP INDEX IF EXISTS public.idx_ai_chats_updated_at;
