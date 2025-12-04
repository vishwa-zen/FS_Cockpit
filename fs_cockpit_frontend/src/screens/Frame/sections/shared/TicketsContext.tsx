import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { ticketsAPI } from "../../../../services/api";

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
  fetchTickets: () => Promise<void>;
  searchTickets: (query: string, type: string) => Promise<Ticket[]>;
  clearSearchResults: () => void;
  setSelectedTicketId: (id?: string | null) => void;
  setActiveTab: (tab: string) => void;
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

  const fetchTickets = useCallback(async () => {
    console.log("[TicketsContext] fetchTickets called");
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketsAPI.getMyTickets();
      if (response.success && response.data && Array.isArray(response.data)) {
        setMyTickets(response.data as Ticket[]);
        console.log(
          "[TicketsContext] ✅ Fetched",
          response.data.length,
          "tickets"
        );
      } else {
        setMyTickets([]);
        setError("No tickets available");
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      setMyTickets([]);
      setError("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      console.log("[TicketsContext] User authenticated, fetching tickets");
      fetchTickets();
    } else {
      console.log(
        "[TicketsContext] No auth token found, skipping ticket fetch"
      );
      setIsLoading(false);
    }

    // Listen for login complete event
    const handleLoginComplete = () => {
      console.log(
        "[TicketsContext] 🔔 Login complete event received, fetching tickets"
      );
      const newToken = localStorage.getItem("msal.token");
      const newAccount = localStorage.getItem("msal.account");

      if (newToken && newAccount) {
        fetchTickets();
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

  const value: TicketsContextValue = useMemo(
    () => ({
      myTickets,
      searchResults,
      isLoading,
      isSearching,
      error,
      selectedTicketId: selectedTicketIdState,
      activeTab,
      fetchTickets,
      searchTickets,
      clearSearchResults,
      setSelectedTicketId,
      setActiveTab: setActiveTabCallback,
    }),
    [
      myTickets,
      searchResults,
      isLoading,
      isSearching,
      error,
      selectedTicketIdState,
      activeTab,
      fetchTickets,
      searchTickets,
      clearSearchResults,
      setSelectedTicketId,
      setActiveTabCallback,
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
