/**
 * AppSidebar Component
 *
 * Left sidebar navigation panel with unified search and tickets list.
 * Provides two search inputs: top for quick search (Enter key), bottom with search type selector.
 *
 * Features:
 * - Unified search input with Enter key support
 * - Search type dropdown (User/Device/Ticket)
 * - Scrollable tickets list with selection highlighting
 * - Fixed width (320px) with responsive overflow handling
 * - Bottom search bar with type selector button
 * - Filtered results section with descriptive text
 *
 * Layout:
 * - Top: Quick search input
 * - Middle: Filtered results header + scrollable tickets list
 * - Bottom: Advanced search with type selector dropdown
 *
 * @example
 * <AppSidebar
 *   searchQuery={query}
 *   setSearchQuery={setQuery}
 *   searchType="User"
 *   setSearchType={setType}
 *   onSearch={handleSearch}
 *   tickets={myTickets}
 *   selectedTicketId={selectedId}
 *   onTicketClick={handleTicketClick}
 *   showSearchDropdown={showDropdown}
 *   setShowSearchDropdown={setShowDropdown}
 * />
 */
import React from "react";
import { SearchIcon, ChevronDownIcon } from "@components/icons";
import { TicketsList } from "@components/tickets/TicketsList";

/**
 * Props for the AppSidebar component
 *
 * @interface AppSidebarProps
 */
interface AppSidebarProps {
  /** Current search query text */
  searchQuery: string;
  /** Callback to update search query */
  setSearchQuery: (query: string) => void;
  /** Selected search type (User/Device/Ticket) */
  searchType: "User" | "Device" | "Ticket";
  /** Callback to change search type */
  setSearchType: (type: "User" | "Device" | "Ticket") => void;
  /** Callback fired when search is executed */
  onSearch: () => void;
  /** Array of ticket objects to display in list */
  tickets: any[];
  /** Currently selected ticket ID (for highlighting) */
  selectedTicketId: string | null;
  /** Callback fired when a ticket is clicked */
  onTicketClick: (ticketId: string) => void;
  /** Whether search type dropdown is visible */
  showSearchDropdown: boolean;
  /** Callback to toggle search dropdown */
  setShowSearchDropdown: (show: boolean) => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  searchType,
  setSearchType,
  onSearch,
  tickets,
  selectedTicketId,
  onTicketClick,
  showSearchDropdown,
  setShowSearchDropdown,
}) => {
  return (
    <aside className="w-80 bg-white border-r border-[#E1E8F0] flex flex-col overflow-hidden">
      <div className="p-4 border-b border-[#E1E8F0]">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <input
            type="text"
            placeholder="Unified Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="[font-family:'Arial-Regular',Helvetica] w-full pl-10 pr-4 py-2.5 border border-[#E1E8F0] rounded-lg text-sm text-[#0E162B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3">
          <h3 className="[font-family:'Arial-Regular',Helvetica] text-xs font-semibold text-[#0E162B] mb-2">
            Filtered Results
          </h3>
          <p className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#61738D]">
            Active and recent tickets requiring attention
          </p>
        </div>

        <TicketsList
          tickets={tickets}
          onTicketClick={onTicketClick}
          selectedTicketId={selectedTicketId}
        />
      </div>

      <div className="p-4 border-t border-[#E1E8F0]">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="INC0012"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="[font-family:'Arial-Regular',Helvetica] flex-1 px-3 py-2 border border-[#E1E8F0] rounded-lg text-sm text-[#0E162B] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
          />
          <div className="relative">
            <button
              onClick={() => setShowSearchDropdown(!showSearchDropdown)}
              className="[font-family:'Arial-Regular',Helvetica] px-4 py-2 bg-[#3B82F6] text-white text-sm rounded-lg hover:bg-[#2563EB] flex items-center gap-2"
            >
              {searchType}
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            {showSearchDropdown && (
              <div className="absolute bottom-full mb-2 right-0 w-32 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-1 z-50">
                {(["User", "Device", "Ticket"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSearchType(type);
                      setShowSearchDropdown(false);
                    }}
                    className="[font-family:'Arial-Regular',Helvetica] w-full px-4 py-2 text-left text-sm hover:bg-[#F3F4F6] text-[#111827]"
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onSearch}
            className="p-2 bg-[#3B82F6] text-white rounded-lg hover:bg-[#2563EB]"
          >
            <SearchIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
