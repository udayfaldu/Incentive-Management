-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Allow public select reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Allow public update reset tokens" ON public.password_reset_tokens;

-- Policies for anon/authenticated access
CREATE POLICY "Allow public insert reset tokens" ON public.password_reset_tokens
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Allow public select reset tokens" ON public.password_reset_tokens
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Allow public update reset tokens" ON public.password_reset_tokens
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- RPC to check if an email exists in public.profiles
CREATE OR REPLACE FUNCTION public.check_email_exists(email_to_check text)
RETURNS boolean AS $$
DECLARE
  exists_flag boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = email_to_check
  ) INTO exists_flag;
  RETURN exists_flag;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC to reset user password using token
CREATE OR REPLACE FUNCTION public.reset_password_via_token(token_val text, new_password text)
RETURNS boolean AS $$
DECLARE
  user_email text;
  user_id uuid;
BEGIN
  -- 1. Find and validate the token
  SELECT email INTO user_email
  FROM public.password_reset_tokens
  WHERE token = token_val
    AND used = false
    AND expires_at > now();
    
  IF user_email IS NULL THEN
    RETURN false;
  END IF;
  
  -- 2. Find the user ID from profiles
  SELECT id INTO user_id
  FROM public.profiles
  WHERE lower(email) = lower(user_email);
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- 3. Update the password in auth.users using bcrypt encryption
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = user_id;
  
  -- 4. Mark the token as used
  UPDATE public.password_reset_tokens
  SET used = true
  WHERE token = token_val;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
