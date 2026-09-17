-- ============================================================================
-- ConnectSphere Supabase Migration: 16_notification_triggers.sql
-- Realtime Notification Triggers for Likes, Comments, and Follows
-- ============================================================================

-- 1. Post Like Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_post_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  actor_name TEXT;
BEGIN
  -- Get post author
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  -- Don't notify if user likes their own post
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get actor name
  SELECT COALESCE(full_name, username) INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, actor_id, type, resource_id, resource_type, title, message)
  VALUES (
    post_author_id,
    NEW.user_id,
    'like',
    NEW.post_id::text,
    'post',
    'New Like',
    COALESCE(actor_name, 'Someone') || ' liked your post'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_post_like_notification ON public.post_likes;
CREATE TRIGGER trigger_post_like_notification
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_like_notification();


-- 2. Post Comment Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_post_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  actor_name TEXT;
BEGIN
  SELECT user_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
  
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, username) INTO actor_name FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (user_id, actor_id, type, resource_id, resource_type, title, message)
  VALUES (
    post_author_id,
    NEW.user_id,
    'comment',
    NEW.post_id::text,
    'post',
    'New Comment',
    COALESCE(actor_name, 'Someone') || ' commented on your post'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_post_comment_notification ON public.post_comments;
CREATE TRIGGER trigger_post_comment_notification
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment_notification();


-- 3. Follow Notification Trigger
CREATE OR REPLACE FUNCTION public.handle_follow_notification()
RETURNS TRIGGER AS $$
DECLARE
  actor_name TEXT;
BEGIN
  SELECT COALESCE(full_name, username) INTO actor_name FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (user_id, actor_id, type, resource_id, resource_type, title, message)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    NEW.follower_id::text,
    'profile',
    'New Follower',
    COALESCE(actor_name, 'Someone') || ' started following you'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_follow_notification ON public.followers;
CREATE TRIGGER trigger_follow_notification
  AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION public.handle_follow_notification();
