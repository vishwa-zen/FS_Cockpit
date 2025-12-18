/**
 * TicketDetailsPage Component
 *
 * Full-page ticket details view with sidebar navigation.
 * Displays comprehensive ticket information with device details, knowledge articles, and actions.
 *
 * Features:
 * - Full-width ticket details panel
 * - Left sidebar with search and all tickets list
 * - Header with user menu and branding
 * - Footer with system health status
 * - Auto-redirect if ticket not found
 * - Loading state during ticket fetch
 * - Click ticket in sidebar to navigate to different ticket
 *
 * URL Structure:
 * - /issue/:id - Display specific ticket by ID
 *
 * Layout:
 * - Left: AppSidebar (320px fixed width)
 * - Top: AppHeader with branding and user menu
 * - Center: TicketDetailsPanel with full ticket information
 * - Bottom: AppFooter with system status
 *
 * Error Handling:
 * - Loading state: Shows centered spinner
 * - Ticket not found: Shows error message with "Go to Home" button
 * - Auto-redirects to /home if ticket doesn't exist after loading
 *
 * @example
 * // Used as route in App.tsx:
 * <Route path="/issue/:id" element={<ProtectedRoute><TicketDetailsPage /></ProtectedRoute>} />
 */
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@hooks/useAuth";
import { useTickets } from "@context";
import { AppHeader, AppSidebar, AppFooter } from "@components/layout";
import { TicketDetailsPanel } from "@components/tickets";
import { AlertCircle } from "lucide-react";
import { ROUTES, getIssueRoute } from "@constants";

/**
 * TicketDetailsPage Component
 *
 * Renders the full-page ticket details view with navigation sidebar.
 *
 * @returns {JSX.Element} Ticket details page with sidebar layout
 */
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
      navigate(ROUTES.HOME);
    }
  }, [isLoading, selectedTicket, id, navigate]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate(ROUTES.LOGIN);
    } catch (error) {
      // Silently handle logout errors
    }
  };

  const handleTicketClick = (ticketId: string) => {
    navigate(getIssueRoute(ticketId));
  };

  const handleSearch = () => {
    // Navigate to search page or handle search
    navigate(
      `${ROUTES.SEARCH}?q=${encodeURIComponent(searchQuery)}&type=${searchType}`
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-gray">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-secondary"></div>
      </div>
    );
  }

  if (!selectedTicket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-gray">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h2 className="[font-family:'Arial-Regular',Helvetica] text-xl font-semibold text-text-primary mb-2">
            Ticket Not Found
          </h2>
          <p className="[font-family:'Arial-Regular',Helvetica] text-text-secondary mb-4">
            The ticket you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate(ROUTES.HOME)}
            className="[font-family:'Arial-Regular',Helvetica] bg-brand-secondary hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-gray flex">
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
          onLogout={() => logout().then(() => navigate(ROUTES.LOGIN))}
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
