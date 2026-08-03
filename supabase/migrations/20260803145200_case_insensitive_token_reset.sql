-- Update password reset token verification function to be case-insensitive
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
  
  -- 2. Find the user ID from profiles with case-insensitive comparison
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
