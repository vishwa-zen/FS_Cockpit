/**
 * @fileoverview Tickets Context Provider
 *
 * Global state management for ticket data across the application.
 * Provides centralized ticket fetching, searching, and state updates.
 *
 * Features:
 * - Auto-fetch tickets on mount
 * - Pagination support with load more functionality
 * - Search capability (User/Device/Ticket)
 * - Selected ticket and active tab state management
 * - Device name updates for tickets
 * - Error handling and loading states
 *
 * @module context/TicketsContext
 * @requires services/api - Ticket API methods
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { ticketsAPI, PaginationInfo } from "@services/api";

/**
 * Ticket Data Interface
 *
 * Represents a ServiceNow incident/ticket with all relevant fields
 *
 * @interface Ticket
 * @property {string} id - Unique ticket identifier (incident number)
 * @property {string} status - Current ticket status (New, In Progress, etc.)
 * @property {string} [statusColor] - Tailwind color class for status badge
 * @property {string} title - Ticket title/short description
 * @property {string} [time] - Time ago string (e.g., "2 hours ago")
 * @property {string} [device] - Associated device name
 * @property {string} [priority] - Priority level (High, Medium, Low)
 * @property {string} [priorityColor] - Tailwind color class for priority badge
 * @property {string} [callerId] - User ID who opened the ticket
 * @property {string} [callerName] - User name who opened the ticket
 * @property {string} [openedAt] - ISO timestamp when ticket was opened
 * @property {string} [lastUpdatedAt] - ISO timestamp of last update
 */
interface Ticket {
  id: string;
  status: string;
  statusColor?: string;
  title: string;
  time?: string;
  device?: string;
  priority?: string;
  priorityColor?: string;
  callerId?: string;
  callerName?: string;
  openedAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Tickets Context Value Interface
 *
 * Defines the shape of the tickets context value available to consumers
 *
 * @interface TicketsContextValue
 * @property {Ticket[]} myTickets - Array of user's assigned tickets
 * @property {Ticket[]} searchResults - Array of search result tickets
 * @property {boolean} isLoading - Loading state for initial ticket fetch
 * @property {boolean} isSearching - Loading state for search operations
 * @property {string | null} error - Error message if fetch/search fails
 * @property {string | null} [selectedTicketId] - Currently selected ticket ID
 * @property {string | null} [activeTab] - Currently active tab (My Tickets, Copilot, etc.)
 * @property {PaginationInfo | null} pagination - Pagination metadata
 * @property {boolean} hasMore - Whether more tickets are available to load
 * @property {number} limit - Number of tickets per page
 * @property {Function} fetchTickets - Fetch tickets with optional reset
 * @property {Function} loadMoreTickets - Load next page of tickets
 * @property {Function} setLimit - Update pagination limit
 * @property {Function} searchTickets - Search for tickets by query and type
 * @property {Function} clearSearchResults - Clear current search results
 * @property {Function} setSelectedTicketId - Set the selected ticket ID
 * @property {Function} setActiveTab - Set the active tab name
 * @property {Function} updateTicketDevice - Update device name for a ticket
 */
interface TicketsContextValue {
  myTickets: Ticket[];
  searchResults: Ticket[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  selectedTicketId?: string | null;
  activeTab?: string | null;
  pagination: PaginationInfo | null;
  hasMore: boolean;
  limit: number;
  fetchTickets: (reset?: boolean, customLimit?: number) => Promise<void>;
  loadMoreTickets: () => Promise<void>;
  setLimit: (limit: number) => void;
  searchTickets: (query: string, type: string) => Promise<Ticket[]>;
  clearSearchResults: () => void;
  setSelectedTicketId: (id?: string | null) => void;
  setActiveTab: (tab: string) => void;
  updateTicketDevice: (ticketId: string, deviceName: string) => void;
}

/**
 * Tickets React Context
 *
 * React context object holding tickets state and methods.
 * Use via useTickets() hook instead of directly.
 *
 * @constant {React.Context<TicketsContextValue | undefined>}
 */
const TicketsContext = createContext<TicketsContextValue | undefined>(
  undefined
);

/**
 * Tickets Context Provider Component
 *
 * Provides global tickets state to all child components.
 * Automatically fetches tickets on mount and manages all ticket-related state.
 *
 * @component
 * @param {Object} props
 * @param {ReactNode} props.children - Child components that need ticket access
 * @returns {JSX.Element} Provider wrapping children
 *
 * @example
 * // Wrap app with provider (typically in index.tsx)
 * <TicketsProvider>
 *   <BrowserRouter>
 *     <Routes>
 *       <Route path="/home" element={<DashboardPage />} />
 *     </Routes>
 *   </BrowserRouter>
 * </TicketsProvider>
 */
export const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketIdState, setSelectedTicketIdState] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [limit, setLimit] = useState<number>(25);

  /**
   * Fetch Tickets from API
   *
   * Fetches paginated tickets from ServiceNow API. Supports reset mode
   * for initial load and append mode for pagination.
   *
   * @async
   * @function fetchTickets
   * @param {boolean} [reset=false] - If true, replaces current tickets; if false, appends
   * @param {number} [customLimit] - Override default limit for this fetch
   * @returns {Promise<void>}
   *
   * @example
   * // Initial load (reset)
   * await fetchTickets(true);
   *
   * @example
   * // Load more (append)
   * await fetchTickets(false);
   */
  const fetchTickets = useCallback(
    async (reset: boolean = false, customLimit?: number) => {
      setIsLoading(true);
      setError(null);

      const effectiveLimit = customLimit ?? limit;
      const offset = reset ? 0 : currentOffset;

      try {
        const response = await ticketsAPI.getMyTickets(effectiveLimit, offset);
        if (response.success && response.data && Array.isArray(response.data)) {
          if (reset) {
            setMyTickets(response.data as Ticket[]);
            setCurrentOffset(effectiveLimit);
          } else {
            setMyTickets((prev) => [...prev, ...(response.data as Ticket[])]);
            setCurrentOffset((prev) => prev + effectiveLimit);
          }
          setPagination(response.pagination || null);
        } else {
          if (reset) {
            setMyTickets([]);
            setPagination(null);
          }
          setError("No tickets available");
        }
      } catch (err) {
        if (reset) {
          setMyTickets([]);
          setPagination(null);
        }
        setError("Failed to load tickets");
      } finally {
        setIsLoading(false);
      }
    },
    [currentOffset, limit]
  );

  /**
   * Load More Tickets (Pagination)
   *
   * Fetches the next page of tickets if available.
   * Only proceeds if hasMore is true and not currently loading.
   *
   * @async
   * @function loadMoreTickets
   * @returns {Promise<void>}
   */
  const loadMoreTickets = useCallback(async () => {
    if (!pagination?.has_more || isLoading) return;
    await fetchTickets(false);
  }, [pagination, isLoading, fetchTickets]);

  /**
   * Search Tickets by Query and Type
   *
   * Searches for tickets using different strategies based on type.
   * Routes to appropriate API endpoint (Device, User, or general search).
   *
   * @async
   * @function searchTickets
   * @param {string} query - Search query string
   * @param {string} type - Search type ("User", "Device", or "Ticket")
   * @returns {Promise<Ticket[]>} Array of matching tickets
   *
   * @example
   * const results = await searchTickets("john.doe", "User");
   */
  const searchTickets = useCallback(async (query: string, type: string) => {
    setIsSearching(true);
    setError(null);
    try {
      let response;
      if (type === "Device") {
        response = await ticketsAPI.getIncidentsByDevice(query);
        if (response.success && response.data) {
          setSearchResults(response.data as Ticket[]);
          return response.data as Ticket[];
        }
        return [] as Ticket[];
      } else if (type === "User") {
        response = await ticketsAPI.getUserIncidents(query);
        if (response.success && response.data) {
          setSearchResults(response.data as Ticket[]);
          return response.data as Ticket[];
        }
        return [] as Ticket[];
      } else {
        response = await ticketsAPI.searchTickets(query, type);
        if (response.success && response.data) {
          setSearchResults(response.data as Ticket[]);
          return response.data as Ticket[];
        }
        return [] as Ticket[];
      }
    } catch (err) {
      return [] as Ticket[];
    } finally {
      setIsSearching(false);
    }
  }, []);

  /**
   * Clear Search Results
   *
   * Resets search results and searching state.
   * Called when user clears search or navigates away.
   *
   * @function clearSearchResults
   * @returns {void}
   */
  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  useEffect(() => {
    // Only fetch tickets if user is authenticated (has token)
    const token = localStorage.getItem("msal.token");
    const account = localStorage.getItem("msal.account");

    if (token && account) {
      fetchTickets(true);
    } else {
      setIsLoading(false);
    }

    // Listen for login complete event
    const handleLoginComplete = () => {
      const newToken = localStorage.getItem("msal.token");
      const newAccount = localStorage.getItem("msal.account");

      if (newToken && newAccount) {
        fetchTickets(true);
      }
    };

    window.addEventListener("loginComplete", handleLoginComplete);

    return () => {
      window.removeEventListener("loginComplete", handleLoginComplete);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelectedTicketId = useCallback((id?: string | null) => {
    setSelectedTicketIdState(id ?? null);
  }, []);

  const setActiveTabCallback = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  /**
   * Update Device Name for Ticket
   *
   * Updates the device name field for a specific ticket in the local state.
   * Used when device information is fetched from Intune after initial ticket load.
   *
   * @function updateTicketDevice
   * @param {string} ticketId - Ticket ID to update
   * @param {string} deviceName - New device name
   * @returns {void}
   *
   * @example
   * // Update device after fetching from Intune
   * updateTicketDevice("INC0123456", "DESKTOP-ABC123");
   */
  const updateTicketDevice = useCallback(
    (ticketId: string, deviceName: string) => {
      setMyTickets((prev) => {
        const updated = prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, device: deviceName } : ticket
        );
        return updated;
      });
    },
    []
  );

  const value: TicketsContextValue = useMemo(
    () => ({
      myTickets,
      searchResults,
      isLoading,
      isSearching,
      error,
      selectedTicketId: selectedTicketIdState,
      activeTab,
      pagination,
      hasMore: pagination?.has_more || false,
      limit,
      fetchTickets,
      loadMoreTickets,
      setLimit,
      searchTickets,
      clearSearchResults,
      setSelectedTicketId,
      setActiveTab: setActiveTabCallback,
      updateTicketDevice,
    }),
    [
      myTickets,
      searchResults,
      isLoading,
      isSearching,
      error,
      selectedTicketIdState,
      activeTab,
      pagination,
      limit,
      fetchTickets,
      loadMoreTickets,
      searchTickets,
      clearSearchResults,
      setSelectedTicketId,
      setActiveTabCallback,
      updateTicketDevice,
    ]
  );

  return (
    <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>
  );
};

export const useTickets = () => {
  const ctx = useContext(TicketsContext);
  if (!ctx) throw new Error("useTickets must be used within a TicketsProvider");
  return ctx;
};
