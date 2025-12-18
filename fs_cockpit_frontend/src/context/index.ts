/**
 * Context Providers Barrel Export
 *
 * Exports all React context providers and hooks:
 * - TicketsProvider: Global ticket state management provider
 * - useTickets: Hook to access ticket context (must be used within TicketsProvider)
 *
 * @module context
 */

export { TicketsProvider, useTickets } from "./TicketsContext";
