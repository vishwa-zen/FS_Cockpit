import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { ticketsAPI, PaginationInfo } from "../services/api";

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

const TicketsContext = createContext<TicketsContextValue | undefined>(
  undefined
);

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
        console.error("Failed to fetch tickets:", err);
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

  const loadMoreTickets = useCallback(async () => {
    if (!pagination?.has_more || isLoading) return;
    await fetchTickets(false);
  }, [pagination, isLoading, fetchTickets]);

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
      console.error("Search failed:", err);
      return [] as Ticket[];
    } finally {
      setIsSearching(false);
    }
  }, []);

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

  const updateTicketDevice = useCallback(
    (ticketId: string, deviceName: string) => {
      console.log(
        `[TicketsContext] 🔄 Updating ticket ${ticketId} device to: ${deviceName}`
      );
      setMyTickets((prev) => {
        const updated = prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, device: deviceName } : ticket
        );
        console.log(`[TicketsContext] ✅ Ticket updated in state:`, {
          before: prev.find((t) => t.id === ticketId)?.device,
          after: updated.find((t) => t.id === ticketId)?.device,
        });
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
