-- Work reports: one daily work log per employee per day
CREATE TYPE public.report_status AS ENUM ('pending', 'reviewed');

CREATE TABLE public.work_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date DATE NOT NULL DEFAULT (now()::date),
  content TEXT NOT NULL DEFAULT '',
  hours NUMERIC(4,1) NOT NULL DEFAULT 0,
  status public.report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_date)
);
CREATE INDEX work_reports_user_idx ON public.work_reports (user_id, report_date DESC);
CREATE INDEX work_reports_date_idx ON public.work_reports (report_date DESC);

GRANT SELECT, INSERT, UPDATE ON public.work_reports TO authenticated;
GRANT ALL ON public.work_reports TO service_role;
ALTER TABLE public.work_reports ENABLE ROW LEVEL SECURITY;

-- Employees read/insert/update their own; admins read & update all
CREATE POLICY "report read own or admin" ON public.work_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "report insert own" ON public.work_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "report update own or admin" ON public.work_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
