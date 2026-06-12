-- Admin write policies required by the admin panel server functions.
-- These run with the caller's JWT (anon key), so RLS must explicitly permit admins.

-- Admins can change anyone's attendance (correct missed/forgotten punches).
CREATE POLICY "att update admin" ON public.attendance FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can assign/revoke roles (insert + delete on user_roles).
CREATE POLICY "roles insert admin" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles delete admin" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT DELETE ON public.user_roles TO authenticated;
