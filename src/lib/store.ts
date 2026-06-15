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
  use_paid_leave?: boolean;
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

export type WfhRequest = {
  id: string;
  user_id: string;
  date: string; // single day worked from home
  reason: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export type Expense = {
  id: string;
  user_id: string;
  date: string; // date the expense was incurred
  amount: number; // in rupees
  category: string;
  reason: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

export type Employee = {
  id: string;
  emp_code: string;
  password: string;
  email?: string;
  full_name: string;
  designation: string;
  team: string;
  paid_leave_balance?: number;
  created_at: string;
  isFirstLogin?: boolean;
};

export const EXPENSE_CATEGORIES = ["Travel", "Food", "Equipment", "Shoot", "Other"];

const TEAM_NAME_MAP: Record<string, string> = {
  Studio: "Designing",
  Buzz: "Social Media",
  "People Ops": "Administration & HR",
  Growth: "Marketing",
  Outreach: "Telecalling",
};

function normalizeTeamName(team: string) {
  return TEAM_NAME_MAP[team] ?? team;
}

// Team list — selectable when adding an employee.
const DEFAULT_DEPARTMENTS = [
  "Tech", // was IT
  "Designing",
  "Marketing",
  "Social Media",
  "Telecalling",
  "Production",
  "Fleet", // was Driver
  "Administration & HR",
];

type DB = {
  attendance: Attendance[];
  leave: LeaveRequest[];
  reports: WorkReport[];
  wfh: WfhRequest[];
  expenses: Expense[];
  employees: Employee[];
  departments: string[];
  profile: { pl_balance: number };
};

const KEY = "flow.data";

function read(): DB {
  const empty: DB = {
    attendance: [],
    leave: [],
    reports: [],
    wfh: [],
    expenses: [],
    employees: [],
    departments: DEFAULT_DEPARTMENTS.slice(),
    profile: { pl_balance: 1 },
  };
  if (typeof localStorage === "undefined") return empty;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = { ...empty, ...JSON.parse(raw) } as DB;
    parsed.employees = (parsed.employees ?? []).map((employee) => ({
      ...employee,
      team: normalizeTeamName(employee.team),
    }));
    const existingDepartments = Array.isArray((parsed as { departments?: string[] }).departments)
      ? parsed.departments
      : [];
    parsed.departments = Array.from(
      new Set(
        [...DEFAULT_DEPARTMENTS, ...existingDepartments, ...parsed.employees.map((employee) => employee.team)]
          .map((department) => normalizeTeamName((department ?? "").trim()))
          .filter(Boolean),
      ),
    );
    return parsed;
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

function randomIndex(max: number) {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function randomString(length: number, alphabet: string) {
  return Array.from({ length }, () => alphabet[randomIndex(alphabet.length)]).join("");
}

function generateEmployeeCode(db: DB) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = `EMP-${randomString(6, alphabet)}`;
  } while (db.employees.some((employee) => employee.emp_code === code));
  return code;
}

function generatePassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%";
  const all = upper + lower + digits + symbols;
  const chars = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
    ...randomString(8, all),
  ];

  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function generateEmployeePassword(db: DB) {
  let password = "";
  do {
    password = generatePassword();
  } while (db.employees.some((employee) => employee.password === password));
  return password;
}

function paidLeaveBalanceFor(db: DB, userId: string) {
  const employee = db.employees.find((entry) => entry.id === userId);
  if (employee?.paid_leave_balance != null) return employee.paid_leave_balance;

  const used = db.leave
    .filter(
      (request) =>
        request.user_id === userId &&
        request.status === "approved" &&
        request.use_paid_leave !== false,
    )
    .reduce((total, request) => total + request.days, 0);
  return Math.max(0, 1 - used);
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
    profile: { full_name: "", pl_balance: paidLeaveBalanceFor(db, userId) },
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
  return { balance: paidLeaveBalanceFor(db, userId), requests };
}

export async function requestLeave(
  userId: string,
  start_date: string,
  end_date: string,
  reason: string,
  usePaidLeave: boolean,
) {
  const db = read();
  const days = workingDaysBetween(start_date, end_date);
  if (days < 1) throw new Error("Select a valid date range");
  const balance = paidLeaveBalanceFor(db, userId);
  if (usePaidLeave && days > balance) {
    throw new Error(
      `Only ${balance} paid leave${balance === 1 ? "" : "s"} remaining. Turn off paid leave to continue.`,
    );
  }
  db.leave.push({
    id: id(),
    user_id: userId,
    start_date,
    end_date,
    days,
    use_paid_leave: usePaidLeave,
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
  const balanceBeforeApproval = paidLeaveBalanceFor(db, req.user_id);
  if (
    approve &&
    req.use_paid_leave !== false &&
    req.days > balanceBeforeApproval
  ) {
    throw new Error("This employee no longer has enough paid leave remaining");
  }
  req.status = approve ? "approved" : "declined";
  if (approve && req.use_paid_leave !== false) {
    const employee = db.employees.find((entry) => entry.id === req.user_id);
    if (employee) {
      employee.paid_leave_balance = Math.max(
        0,
        balanceBeforeApproval - req.days,
      );
    }
  }
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

export async function getDepartments() {
  const db = read();
  return { departments: db.departments.slice().sort((a, b) => a.localeCompare(b)) };
}

export async function addEmployee(full_name: string, designation: string, team: string) {
  const db = read();
  const normalizedTeam = normalizeTeamName(team.trim());
  if (normalizedTeam && !db.departments.includes(normalizedTeam)) {
    db.departments.push(normalizedTeam);
  }
  const emp: Employee = {
    id: id(),
    emp_code: generateEmployeeCode(db),
    password: generateEmployeePassword(db),
    full_name: full_name.trim(),
    designation: designation.trim(),
    team: normalizedTeam,
    paid_leave_balance: 1,
    created_at: new Date().toISOString(),
    isFirstLogin: true,
  };
  db.employees.push(emp);
  write(db);
  return emp;
}

export async function addDepartment(name: string) {
  const db = read();
  const department = normalizeTeamName(name.trim());
  if (!department) throw new Error("Department name is required");
  if (db.departments.some((entry) => entry.toLowerCase() === department.toLowerCase())) {
    throw new Error("Department already exists");
  }
  db.departments.push(department);
  write(db);
  return { ok: true };
}

export async function renameDepartment(currentName: string, nextName: string) {
  const db = read();
  const current = normalizeTeamName(currentName.trim());
  const next = normalizeTeamName(nextName.trim());
  if (!current) throw new Error("Department not found");
  if (!next) throw new Error("Department name is required");
  const index = db.departments.findIndex((entry) => entry.toLowerCase() === current.toLowerCase());
  if (index === -1) throw new Error("Department not found");
  const duplicate = db.departments.some(
    (entry, entryIndex) => entryIndex !== index && entry.toLowerCase() === next.toLowerCase(),
  );
  if (duplicate) throw new Error("Department already exists");
  db.departments[index] = next;
  db.employees = db.employees.map((employee) =>
    employee.team.toLowerCase() === current.toLowerCase()
      ? { ...employee, team: next }
      : employee,
  );
  write(db);
  return { ok: true };
}

export async function deleteDepartment(name: string) {
  const db = read();
  const department = normalizeTeamName(name.trim());
  const exists = db.departments.some((entry) => entry.toLowerCase() === department.toLowerCase());
  if (!exists) throw new Error("Department not found");
  db.departments = db.departments.filter((entry) => entry.toLowerCase() !== department.toLowerCase());
  db.employees = db.employees.map((employee) =>
    employee.team.toLowerCase() === department.toLowerCase()
      ? { ...employee, team: "" }
      : employee,
  );
  write(db);
  return { ok: true };
}

export async function updateEmployeeCredentials(employeeId: string, email: string, newPassword: string) {
  const db = read();
  const emp = db.employees.find((e) => e.id === employeeId);
  if (!emp) throw new Error("Employee not found");
  if (email) emp.email = email.trim().toLowerCase();
  if (newPassword) emp.password = newPassword;
  emp.isFirstLogin = false;
  write(db);
  return emp;
}

export async function dismissFirstLogin(employeeId: string) {
  const db = read();
  const emp = db.employees.find((e) => e.id === employeeId);
  if (emp) { emp.isFirstLogin = false; write(db); }
  return { ok: true };
}

export async function deleteEmployee(employeeId: string) {
  const db = read();
  db.employees = db.employees.filter((e) => e.id !== employeeId);
  // Clean up the employee's associated records too.
  db.attendance = db.attendance.filter((a) => a.user_id !== employeeId);
  db.leave = db.leave.filter((l) => l.user_id !== employeeId);
  db.reports = db.reports.filter((r) => r.user_id !== employeeId);
  db.wfh = (db.wfh ?? []).filter((w) => w.user_id !== employeeId);
  db.expenses = (db.expenses ?? []).filter((x) => x.user_id !== employeeId);
  write(db);
  return { ok: true };
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

// ---- Work from home --------------------------------------------------------

export async function getMyWfh(userId: string) {
  const db = read();
  return {
    requests: (db.wfh ?? [])
      .filter((w) => w.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function requestWfh(userId: string, date: string, reason: string) {
  const db = read();
  if (!date) throw new Error("Pick a date");
  db.wfh.push({
    id: id(),
    user_id: userId,
    date,
    reason: reason.slice(0, 500),
    status: "pending",
    created_at: new Date().toISOString(),
  });
  write(db);
  return { ok: true };
}

export async function decideWfh(wfhId: string, approve: boolean) {
  const db = read();
  const r = db.wfh.find((w) => w.id === wfhId);
  if (!r) throw new Error("Not found");
  if (r.status !== "pending") throw new Error("Already decided");
  r.status = approve ? "approved" : "declined";
  write(db);
  return { ok: true };
}

// ---- Expenses --------------------------------------------------------------

export async function getMyExpenses(userId: string) {
  const db = read();
  return {
    expenses: (db.expenses ?? [])
      .filter((x) => x.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
  };
}

export async function requestExpense(
  userId: string,
  date: string,
  amount: number,
  category: string,
  reason: string,
) {
  const db = read();
  const amt = Math.max(0, Number(amount) || 0);
  if (amt <= 0) throw new Error("Enter a valid amount");
  if (!date) throw new Error("Pick a date");
  db.expenses.push({
    id: id(),
    user_id: userId,
    date,
    amount: amt,
    category,
    reason: reason.slice(0, 500),
    status: "pending",
    created_at: new Date().toISOString(),
  });
  write(db);
  return { ok: true };
}

export async function decideExpense(expenseId: string, approve: boolean) {
  const db = read();
  const x = db.expenses.find((e) => e.id === expenseId);
  if (!x) throw new Error("Not found");
  if (x.status !== "pending") throw new Error("Already decided");
  x.status = approve ? "approved" : "declined";
  write(db);
  return { ok: true };
}

// ---- Admin dashboard (single date) ----------------------------------------

export async function getDashboardByDate(date: string) {
  const db = read();
  const dayStart = new Date(date + "T00:00:00").getTime();
  const dayEnd = new Date(date + "T23:59:59.999").getTime();
  const inDay = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= dayStart && t <= dayEnd;
  };

  // Present: anyone with an attendance row that day.
  const presentIds = new Set(db.attendance.filter((a) => inDay(a.punch_in_at)).map((a) => a.user_id));
  const present = db.employees
    .filter((e) => presentIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.full_name, team: e.team }));

  // On approved leave covering that day.
  const onLeave = db.leave
    .filter((l) => l.status === "approved" && l.start_date <= date && l.end_date >= date)
    .map((l) => ({ id: l.id, name: nameFor(db, l.user_id) }));

  // Approved WFH that day.
  const wfhToday = db.wfh
    .filter((w) => w.status === "approved" && w.date === date)
    .map((w) => ({ id: w.id, name: nameFor(db, w.user_id) }));

  // Pending requests submitted that day.
  const leaveRequests = db.leave
    .filter((l) => l.created_at.slice(0, 10) === date)
    .map((l) => ({ ...l, name: nameFor(db, l.user_id) }));
  const wfhRequests = db.wfh
    .filter((w) => w.created_at.slice(0, 10) === date)
    .map((w) => ({ ...w, name: nameFor(db, w.user_id) }));
  const expenses = db.expenses
    .filter((x) => x.date === date)
    .map((x) => ({ ...x, name: nameFor(db, x.user_id) }));

  const absent = db.employees
    .filter((e) => !presentIds.has(e.id) && !onLeave.some((l) => nameFor(db, e.id) === l.name))
    .map((e) => ({ id: e.id, name: e.full_name, team: e.team }));

  return {
    date,
    counts: {
      total: db.employees.length,
      present: present.length,
      onLeave: onLeave.length,
      wfh: wfhToday.length,
      absent: absent.length,
    },
    present,
    onLeave,
    wfhToday,
    leaveRequests,
    wfhRequests,
    expenses,
  };
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
