import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Map numeric priority codes to descriptive labels
// Priority mapping: all textual (no numeric prefixes)
// ServiceNow uses 1-5 scale: 1=Critical, 2=High, 3=Medium, 4=Low, 5=Planning
const priorityMap: Record<string, string> = {
  "1": "Critical",
  "2": "High",
  "3": "Medium",
  "4": "Low",
  "5": "Low",
};

// Map numeric status codes to descriptive labels
const statusMap: Record<string, string> = {
  "1": "New",
  "2": "In Progress",
  "3": "Pending",
  "4": "Resolved",
  "5": "Closed",
};

export function formatPriority(priority?: string | number): string {
  if (priority == null) return "N/A";
  let raw = String(priority).trim();
  // Strip leading numeric code like "1 - Critical" or "2-High"
  raw = raw.replace(/^\d+\s*-\s*/g, "");
  // Numeric only maps directly to textual form
  if (/^\d+$/.test(raw)) return priorityMap[raw] || "Low";
  // Normalize textual values
  const normalized = raw.toLowerCase();
  if (normalized === "critical") return priorityMap["1"];
  if (normalized === "high") return priorityMap["2"];
  if (normalized === "medium") return priorityMap["3"];
  if (normalized === "low" || normalized === "planning")
    return priorityMap["4"];
  return raw;
}

export function formatStatus(status?: string | number): string {
  if (status == null) return "N/A";
  const raw = String(status).trim();
  if (!/^\d+$/.test(raw)) return raw;
  return statusMap[raw] || raw;
}
