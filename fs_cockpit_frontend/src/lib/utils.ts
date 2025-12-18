/**
 * @fileoverview Utility Functions
 *
 * Collection of reusable utility functions for the FS Cockpit application.
 * Includes Tailwind CSS class merging, priority/status formatting helpers.
 *
 * @module lib/utils
 * @requires clsx - Conditional className utility
 * @requires tailwind-merge - Tailwind CSS class conflict resolution
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge and Deduplicate Tailwind CSS Classes
 *
 * Combines multiple className values using clsx and resolves Tailwind CSS
 * class conflicts using tailwind-merge. Ensures no duplicate or conflicting
 * utility classes in the final output.
 *
 * @function cn
 * @param {...ClassValue[]} inputs - Variable number of className values
 *   Can be strings, objects, arrays, or conditional values
 * @returns {string} Merged and deduplicated className string
 *
 * @example
 * // Basic usage
 * cn('px-4 py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 *
 * @example
 * // Conditional classes
 * cn('base-class', { 'active': isActive, 'disabled': isDisabled })
 * // => 'base-class active' (if isActive=true, isDisabled=false)
 *
 * @example
 * // Conflict resolution (tailwind-merge)
 * cn('px-4', 'px-6')
 * // => 'px-6' (later value wins)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Priority Code to Label Mapping
 *
 * Maps numeric ServiceNow priority codes to human-readable labels.
 * Used for displaying ticket priorities in the UI.
 *
 * @constant {Record<string, string>}
 * @property {string} 1 - High priority
 * @property {string} 2 - Medium priority
 * @property {string} 3 - Low priority
 * @property {string} 4 - Low priority (extended)
 * @property {string} 5 - Low priority (extended)
 */
const priorityMap: Record<string, string> = {
  "1": "High",
  "2": "Medium",
  "3": "Low",
  "4": "Low",
  "5": "Low",
};

/**
 * Status Code to Label Mapping
 *
 * Maps numeric ServiceNow status codes to human-readable labels.
 * Used for displaying ticket statuses in the UI.
 *
 * @constant {Record<string, string>}
 * @property {string} 1 - New ticket
 * @property {string} 2 - In Progress
 * @property {string} 3 - Pending
 * @property {string} 4 - Resolved
 * @property {string} 5 - Closed
 */
const statusMap: Record<string, string> = {
  "1": "New",
  "2": "In Progress",
  "3": "Pending",
  "4": "Resolved",
  "5": "Closed",
};

/**
 * Format Priority Value to Standardized Label
 *
 * Converts numeric or textual priority values from ServiceNow API responses
 * into standardized display labels (High, Medium, Low). Handles various
 * input formats including numeric codes, hyphenated strings, and text labels.
 *
 * @function formatPriority
 * @param {string | number | undefined} priority - Raw priority value from API
 * @returns {string} Standardized priority label or "Not Available"
 *
 * @example
 * formatPriority(1) // => "High"
 * formatPriority("2") // => "Medium"
 * formatPriority("3 - Low") // => "Low"
 * formatPriority("Critical") // => "High"
 * formatPriority("Planning") // => "Low"
 * formatPriority(undefined) // => "Not Available"
 */
export function formatPriority(priority?: string | number): string {
  if (priority == null) return "Not Available";
  let raw = String(priority).trim();
  // Strip leading numeric code like "1 - High" or "2-Medium"
  raw = raw.replace(/^\d+\s*-\s*/g, "");
  // Numeric only maps directly to textual form
  if (/^\d+$/.test(raw)) return priorityMap[raw] || "Low";
  // Normalize textual values
  const normalized = raw.toLowerCase();
  // Map "critical" to "High" (in case it comes from API or cache)
  if (normalized === "critical" || normalized.includes("critical"))
    return "High";
  if (normalized === "high") return priorityMap["1"];
  if (normalized === "medium") return priorityMap["2"];
  if (normalized === "low" || normalized === "planning")
    return priorityMap["3"];
  return raw;
}

/**
 * Format Status Value to Standardized Label
 *
 * Converts numeric status codes from ServiceNow API responses into
 * human-readable status labels. Returns textual values as-is.
 *
 * @function formatStatus
 * @param {string | number | undefined} status - Raw status value from API
 * @returns {string} Standardized status label or "Not Available"
 *
 * @example
 * formatStatus(1) // => "New"
 * formatStatus("2") // => "In Progress"
 * formatStatus("4") // => "Resolved"
 * formatStatus("Closed") // => "Closed" (pass-through)
 * formatStatus(undefined) // => "Not Available"
 */
export function formatStatus(status?: string | number): string {
  if (status == null) return "Not Available";
  const raw = String(status).trim();
  if (!/^\d+$/.test(raw)) return raw;
  return statusMap[raw] || raw;
}
