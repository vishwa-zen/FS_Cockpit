import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTickets } from "../context";
import { AppHeader, AppSidebar, AppFooter } from "../components/layout";
import { TicketDetailsPanel } from "../components/tickets";
import { AlertCircle } from "lucide-react";

export const TicketDetailsPage = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const { myTickets, isLoading } = useTickets();

  // State
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchType, setSearchType] = React.useState<
    "User" | "Device" | "Ticket"
  >("Ticket");
  const [showSearchDropdown, setShowSearchDropdown] = React.useState(false);

  // Find the ticket
  const selectedTicket = myTickets.find((t) => t.id === id);

  // Redirect if ticket not found after loading
  useEffect(() => {
    if (!isLoading && !selectedTicket && id) {
      // Ticket not found, redirect to home
      navigate("/home");
    }
  }, [isLoading, selectedTicket, id, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("[TicketDetailsPage] Logout error:", error);
    }
  };

  const handleTicketClick = (ticketId: string) => {
    navigate(`/issue/${ticketId}`);
  };

  const handleSearch = () => {
    // Navigate to search page or handle search
    navigate(`/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3B82F6]"></div>
      </div>
    );
  }

  if (!selectedTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-[#9CA3AF] mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-[#0E162B] mb-2">
            Ticket Not Found
          </h2>
          <p className="text-[#61738D] mb-4">
            The ticket you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/home")}
            className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-2 rounded-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      <AppSidebar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchType={searchType}
        setSearchType={setSearchType}
        onSearch={handleSearch}
        tickets={myTickets}
        selectedTicketId={id || null}
        onTicketClick={handleTicketClick}
        showSearchDropdown={showSearchDropdown}
        setShowSearchDropdown={setShowSearchDropdown}
      />

      <div className="flex-1 flex flex-col">
        <AppHeader
          user={user}
          onLogout={() => logout().then(() => navigate("/login"))}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <TicketDetailsPanel ticket={selectedTicket} />
          </div>
        </main>

        <AppFooter />
      </div>
    </div>
  );
};
