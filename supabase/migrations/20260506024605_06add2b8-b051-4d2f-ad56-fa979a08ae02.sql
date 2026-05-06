
-- ============ USER ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','support'));
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SUPPORT TICKETS ============
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open, pending, resolved, closed
  priority text NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  assigned_to uuid,
  external_thread_id text, -- Resend / message-id for threading
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  direction text NOT NULL, -- inbound, outbound, note
  from_email text,
  from_name text,
  to_email text,
  cc text,
  body_html text,
  body_text text,
  attachments jsonb DEFAULT '[]'::jsonb,
  external_message_id text,
  in_reply_to text,
  author_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);
CREATE INDEX idx_tickets_status ON public.support_tickets(status, last_message_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own tickets" ON public.support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own tickets" ON public.support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins full access tickets" ON public.support_tickets FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view own ticket messages" ON public.support_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
);
CREATE POLICY "Users send messages on own tickets" ON public.support_messages FOR INSERT WITH CHECK (
  direction = 'outbound' OR direction = 'inbound' OR (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  )
);
CREATE POLICY "Admins full access messages" ON public.support_messages FOR ALL USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ ADMIN AUDIT LOG ============
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  target_user_id uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.admin_audit_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert audit" ON public.admin_audit_log FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
