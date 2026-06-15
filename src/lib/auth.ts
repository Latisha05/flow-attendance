// Auth abstraction. Currently localStorage-backed (no real backend).
//
// MIGRATION TO FIRESTORE: replace the bodies of `getCurrentUser`, `signIn`,
// `signUp`, and `signOut` with Firebase Auth calls. The rest of the app only
// touches these functions and `useAuth()`, so pages never change.

import { useEffect, useState } from "react";

export type User = {
  id: string; // matches the Employee record id
  emp_code: string;
  full_name: string;
  display_name?: string;
  designation: string;
  team: string;
};

const STORAGE_KEY = "flow.auth.user";
const DISPLAY_NAME_KEY = "flow.auth.displayNames";
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function getCurrentUser(): User | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function persist(user: User | null) {
  if (typeof localStorage === "undefined") return;
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  else localStorage.removeItem(STORAGE_KEY);
  emit();
}

function readDisplayNames() {
  if (typeof localStorage === "undefined") return {} as Record<string, string>;
  try {
    const raw = localStorage.getItem(DISPLAY_NAME_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDisplayNames(displayNames: Record<string, string>) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DISPLAY_NAME_KEY, JSON.stringify(displayNames));
}

import { findEmployeeByCredentials } from "./store";

/**
 * Log in with an admin-issued Employee ID + password.
 * The session id IS the employee record id, so attendance/leave/reports all
 * attach to the right person and the admin sees them.
 */
export async function signIn(empCode: string, password: string): Promise<User> {
  const emp = await findEmployeeByCredentials(empCode, password);
  const displayNames = readDisplayNames();
  const user: User = {
    id: emp.id,
    emp_code: emp.emp_code,
    full_name: emp.full_name,
    display_name: displayNames[emp.id] ?? "",
    designation: emp.designation,
    team: emp.team,
  };
  persist(user);
  return user;
}

export function updateDisplayName(displayName: string) {
  const current = getCurrentUser();
  if (!current) throw new Error("You need to sign in again");

  const trimmed = displayName.trim().slice(0, 40);
  const displayNames = readDisplayNames();
  if (trimmed) displayNames[current.id] = trimmed;
  else delete displayNames[current.id];
  writeDisplayNames(displayNames);

  const nextUser: User = {
    ...current,
    display_name: trimmed,
  };
  persist(nextUser);
  return nextUser;
}

export function signOut() {
  persist(null);
}

/** Reactive current-user hook. Re-renders on sign in/out across the app. */
export function useAuth() {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    const update = () => setUser(getCurrentUser());
    listeners.add(update);
    // Sync across tabs.
    window.addEventListener("storage", update);
    update();
    return () => {
      listeners.delete(update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return { user, isAuthenticated: !!user };
}
