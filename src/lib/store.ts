// Local data store. Currently localStorage-backed; replaces the old Supabase
// server functions. Synchronous reads/writes wrapped in Promises so the call
// sites (TanStack Query) look identical to a real async backend.
//
// MIGRATION TO FIRESTORE: each function below maps to a Firestore collection
// query/mutation. Keep the signatures and return shapes; swap the bodies.

export type Attendance = {
  id: string;
  user_id: string;
  punch_in_at: string;
  punch_out_at: string | null;
  net_seconds: number | null;
  in_lat?: number | null;
  in_lng?: number | null;
};

export type LeaveRequest = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export type WorkReport = {
  id: string;
  user_id: string;
  report_date: string;
  content: string;
  hours: number;
  status: "pending" | "reviewed";
};

export type Employee = {
  id: string;
  emp_code: string; // auto-generated login ID, e.g. EMP-0001
  password: string; // default password set on creation
  full_name: string;
  designation: string;
  team: string;
  created_at: string;
};

// Default password assigned to every new employee. They log in with their
// Employee ID + this until a real auth backend (Firestore) adds password reset.
export const DEFAULT_PASSWORD = "flow@1234";

type DB = {
  attendance: Attendance[];
  leave: LeaveRequest[];
  reports: WorkReport[];
  employees: Employee[];
  seq: number; // running counter for emp_code generation
  profile: { pl_balance: number };
};

const KEY = "flow.data";

function read(): DB {
  const empty: DB = { attendance: [], leave: [], reports: [], employees: [], seq: 0, profile: { pl_balance: 1 } };
  if (typeof localStorage === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...JSON.parse(raw) } : empty;
  } catch {
    return empty;
  }
}

function write(db: DB) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
}

function id() {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Working days are Mon–Sat; Sundays are not deducted.
function workingDaysBetween(start: string, end: string) {
  const a = new Date(start + "T00:00:00");
  const b = new Date(end + "T00:00:00");
  if (b < a) return 0;
  let count = 0;
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) count++;
  }
  return count;
}

// ---- Attendance ------------------------------------------------------------

export async function getDashboard(userId: string) {
  const db = read();
  const mine = db.attendance.filter((a) => a.user_id === userId);
  const open = mine.find((a) => !a.punch_out_at) ?? null;
  const start = startOfToday().getTime();
  const today = mine.filter((a) => new Date(a.punch_in_at).getTime() >= start);
  const weekStart = startOfToday();
  weekStart.setDate(weekStart.getDate() - 6);
  const week = mine.filter((a) => new Date(a.punch_in_at).getTime() >= weekStart.getTime());
  return {
    profile: { full_name: "", pl_balance: db.profile.pl_balance },
    open,
    today,
    week,
  };
}

export async function punchIn(userId: string, lat?: number | null, lng?: number | null) {
  const db = read();
  const start = startOfToday().getTime();
  if (db.attendance.some((a) => a.user_id === userId && new Date(a.punch_in_at).getTime() >= start)) {
    throw new Error("Already punched in today");
  }
  const row: Attendance = {
    id: id(),
    user_id: userId,
    punch_in_at: new Date().toISOString(),
    punch_out_at: null,
    net_seconds: null,
    in_lat: lat ?? null,
    in_lng: lng ?? null,
  };
  db.attendance.push(row);
  write(db);
  return row;
}

export async function punchOut(userId: string, attendanceId: string) {
  const db = read();
  const row = db.attendance.find((a) => a.id === attendanceId && a.user_id === userId);
  if (!row) throw new Error("Punch not found");
  const now = new Date();
  const elapsed = Math.max(0, Math.floor((now.getTime() - new Date(row.punch_in_at).getTime()) / 1000));
  row.punch_out_at = now.toISOString();
  row.net_seconds = elapsed >= 5 * 3600 ? elapsed - 3600 : elapsed; // 1h break if ≥5h
  write(db);
  return { ok: true };
}

export async function getAttendanceMonth(userId: string, year: number, month: number) {
  const db = read();
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  const rows = db.attendance
    .filter((a) => a.user_id === userId)
    .filter((a) => {
      const t = new Date(a.punch_in_at).getTime();
      return t >= start && t < end;
    })
    .sort((a, b) => a.punch_in_at.localeCompare(b.punch_in_at));
  return { rows };
}

// ---- Leave -----------------------------------------------------------------

export async function getLeaveData(userId: string) {
  const db = read();
  const requests = db.leave
    .filter((l) => l.user_id === userId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { balance: db.profile.pl_balance, requests };
}

export async function requestLeave(userId: string, start_date: string, end_date: string, reason: string) {
  const db = read();
  const days = workingDaysBetween(start_date, end_date);
  if (days < 1) throw new Error("Select a valid date range");
  if (days > db.profile.pl_balance) {
    throw new Error(`Not enough leave balance (${db.profile.pl_balance} PL available, ${days} requested)`);
  }
  db.leave.push({
    id: id(),
    user_id: userId,
    start_date,
    end_date,
    days,
    reason: reason.slice(0, 500),
    status: "pending",
    created_at: new Date().toISOString(),
  });
  write(db);
  return { ok: true };
}

export async function decideLeave(leaveId: string, approve: boolean) {
  const db = read();
  const req = db.leave.find((l) => l.id === leaveId);
  if (!req) throw new Error("Not found");
  if (req.status !== "pending") throw new Error("Already decided");
  req.status = approve ? "approved" : "declined";
  if (approve) db.profile.pl_balance = Math.max(0, db.profile.pl_balance - req.days);
  write(db);
  return { ok: true };
}

// ---- Work reports ----------------------------------------------------------

export async function getMyReports(userId: string) {
  const db = read();
  const mine = db.reports
    .filter((r) => r.user_id === userId)
    .sort((a, b) => b.report_date.localeCompare(a.report_date));
  const today = mine.find((r) => r.report_date === todayStr()) ?? null;
  return { today, history: mine.slice(0, 30) };
}

export async function submitReport(userId: string, content: string, hours: number) {
  const db = read();
  const trimmed = content.slice(0, 4000).trim();
  if (!trimmed) throw new Error("Report cannot be empty");
  const h = Math.min(24, Math.max(0, Number(hours) || 0));
  const existing = db.reports.find((r) => r.user_id === userId && r.report_date === todayStr());
  if (existing) {
    if (existing.status === "reviewed") throw new Error("Today's report was already reviewed and is locked");
    existing.content = trimmed;
    existing.hours = h;
  } else {
    db.reports.push({
      id: id(),
      user_id: userId,
      report_date: todayStr(),
      content: trimmed,
      hours: h,
      status: "pending",
    });
  }
  write(db);
  return { ok: true };
}

export async function getAdminReports(date: string) {
  const db = read();
  const reports = db.reports
    .filter((r) => r.report_date === date)
    .map((r) => ({ ...r, name: nameFor(db, r.user_id) }));
  return { date, reports };
}

export async function reviewReport(reportId: string) {
  const db = read();
  const r = db.reports.find((x) => x.id === reportId);
  if (r) {
    r.status = "reviewed";
    write(db);
  }
  return { ok: true };
}

// ---- Employees (admin) -----------------------------------------------------

function nameFor(db: DB, userId: string) {
  return db.employees.find((e) => e.id === userId)?.full_name ?? "Unknown";
}

export async function getEmployees() {
  const db = read();
  return { employees: db.employees.slice().sort((a, b) => a.full_name.localeCompare(b.full_name)) };
}

export async function addEmployee(full_name: string, designation: string, team: string) {
  const db = read();
  db.seq = (db.seq ?? 0) + 1;
  const emp: Employee = {
    id: id(),
    emp_code: `EMP-${String(db.seq).padStart(4, "0")}`, // EMP-0001, EMP-0002, …
    password: DEFAULT_PASSWORD,
    full_name: full_name.trim(),
    designation: designation.trim(),
    team,
    created_at: new Date().toISOString(),
  };
  db.employees.push(emp);
  write(db);
  return emp;
}

/** Login lookup: match Employee ID (case-insensitive) + password. */
export async function findEmployeeByCredentials(empCode: string, password: string) {
  const db = read();
  const code = empCode.trim().toUpperCase();
  const emp = db.employees.find((e) => e.emp_code.toUpperCase() === code);
  if (!emp) throw new Error("Employee ID not found");
  if (emp.password !== password) throw new Error("Incorrect password");
  return emp;
}

export async function getEmployeeMonth(employeeId: string, year: number, month: number) {
  return getAttendanceMonth(employeeId, year, month);
}

export async function correctPunch(attendanceId: string, punch_in_at: string, punch_out_at: string | null) {
  const db = read();
  const row = db.attendance.find((a) => a.id === attendanceId);
  if (!row) throw new Error("Not found");
  const inAt = new Date(punch_in_at);
  if (isNaN(inAt.getTime())) throw new Error("Invalid punch-in time");
  row.punch_in_at = inAt.toISOString();
  if (punch_out_at) {
    const outAt = new Date(punch_out_at);
    if (isNaN(outAt.getTime()) || outAt <= inAt) throw new Error("Punch-out must be after punch-in");
    const elapsed = Math.floor((outAt.getTime() - inAt.getTime()) / 1000);
    row.net_seconds = elapsed >= 5 * 3600 ? elapsed - 3600 : elapsed;
    row.punch_out_at = outAt.toISOString();
  } else {
    row.punch_out_at = null;
    row.net_seconds = null;
  }
  write(db);
  return { ok: true };
}

export async function getAdminOps() {
  const db = read();
  const start = startOfToday().getTime();
  const today = todayStr();
  const present = new Set(
    db.attendance.filter((a) => !a.punch_out_at && new Date(a.punch_in_at).getTime() >= start).map((a) => a.user_id),
  );
  const onLeave = new Set(
    db.leave.filter((l) => l.status === "approved" && l.start_date <= today && l.end_date >= today).map((l) => l.user_id),
  );
  const pending = db.leave
    .filter((l) => l.status === "pending")
    .map((l) => ({ ...l, name: nameFor(db, l.user_id) }));
  return {
    counts: { present: present.size, onLeave: onLeave.size, total: db.employees.length },
    pending,
    roster: db.employees.map((e) => ({
      id: e.id,
      name: e.full_name,
      status: present.has(e.id) ? "present" : onLeave.has(e.id) ? "leave" : "absent",
    })),
  };
}
