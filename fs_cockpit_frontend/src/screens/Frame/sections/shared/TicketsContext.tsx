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
}

interface TicketsContextValue {
  tickets: Ticket[];
  isLoading: boolean;
  error: string | null;
  selectedTicketId?: string | null;
  activeTab?: string | null;
  fetchTickets: () => Promise<void>;
  searchTickets: (query: string, type: string) => Promise<Ticket[]>;
  setSelectedTicketId: (id?: string | null) => void;
  setActiveTab: (tab: string) => void;
}

const TicketsContext = createContext<TicketsContextValue | undefined>(
  undefined
);

export const TicketsProvider = ({ children }: { children: ReactNode }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTicketIdState, setSelectedTicketIdState] = useState<
    string | null
  >(null);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    console.log('[TicketsContext] fetchTickets called');
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketsAPI.getMyTickets();
      if (response.success && response.data && Array.isArray(response.data)) {
        setTickets(response.data);
      } else {
        setTickets([]);
        setError("No tickets available");
      }
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      setTickets([]);
      setError("Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchTickets = useCallback(async (query: string, type: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await ticketsAPI.searchTickets(query, type);
      if (response.success && response.data) {
        setTickets(response.data);
        return response.data as Ticket[];
      }
      return [] as Ticket[];
    } catch (err) {
      console.error("Search failed:", err);
      return [] as Ticket[];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const setSelectedTicketId = useCallback((id?: string | null) => {
    setSelectedTicketIdState(id ?? null);
  }, []);

  const setActiveTabCallback = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);

  const value: TicketsContextValue = useMemo(
    () => ({
      tickets,
      isLoading,
      error,
      selectedTicketId: selectedTicketIdState,
      activeTab,
      fetchTickets,
      searchTickets,
      setSelectedTicketId,
      setActiveTab: setActiveTabCallback,
    }),
    [
      tickets,
      isLoading,
      error,
      selectedTicketIdState,
      activeTab,
      fetchTickets,
      searchTickets,
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
