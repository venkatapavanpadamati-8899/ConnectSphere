-- ----------------------------------------------------------------------------
-- FIX CONVERSATION & MESSAGE RLS RECURSION
-- ----------------------------------------------------------------------------

-- Helper function with SECURITY DEFINER to check conversation membership without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conv_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conv_id AND user_id = p_user_id
  );
$$;

-- Drop recursive policies
DROP POLICY IF EXISTS "Users can view conversations they belong to" ON public.conversations;
DROP POLICY IF EXISTS "Members view other members in their conversation" ON public.conversation_members;
DROP POLICY IF EXISTS "Messages readable only by conversation members" ON public.messages;
DROP POLICY IF EXISTS "Members can send messages" ON public.messages;

-- Recreate clean policies using is_conversation_member helper
CREATE POLICY "Users can view conversations they belong to" 
  ON public.conversations FOR SELECT 
  USING (public.is_conversation_member(id, auth.uid()));

CREATE POLICY "Members view other members in their conversation" 
  ON public.conversation_members FOR SELECT 
  USING (user_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Messages readable only by conversation members" 
  ON public.messages FOR SELECT 
  USING (public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "Members can send messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND 
    public.is_conversation_member(conversation_id, auth.uid())
  );
