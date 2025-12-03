import {
  ChevronDown,
  LogOut,
  Search,
  Sparkles,
  Info,
  Layers,
  TicketIcon,
  LayoutDashboardIcon,
  SearchIcon,
} from "lucide-react";
import React, { useState } from "react";
import { useTickets } from "../shared/TicketsContext";
import { useAuth } from "../../../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "../../../../components/ui/card";
import TicketsList from "../shared/TicketsList";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";

// Tickets will be provided by the TicketsContext

const systemStatuses = [
  { name: "ServiceNow", status: "online", color: "bg-[#00c950]" },
  { name: "Tachyon", status: "online", color: "bg-[#00c950]" },
  { name: "Nexthink", status: "warning", color: "bg-[#f0b100]" },
  { name: "Intune / SCCM", status: "online", color: "bg-[#00c950]" },
];

export const IssueSearchSection = (): JSX.Element => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("INC0012");
  const {
    myTickets,
    searchResults,
    selectedTicketId,
    setSelectedTicketId,
    searchTickets,
    clearSearchResults,
    activeTab,
    setActiveTab,
  } = useTickets();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchType, setSearchType] = useState<"User" | "Device" | "Ticket">(
    "Ticket"
  );
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  // useTabs state from TicketsContext

  const handleTicketClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    navigate(`/issue/${ticketId}`);
  };

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      await searchTickets(searchQuery, searchType);
    } else {
      clearSearchResults();
    }
  };

  const handleLogout = async () => {
    console.log("[IssueSearchSection] Logout button clicked");
    try {
      await logout();
      // logout() handles navigation, so no need to navigate here
    } catch (error) {
      console.error("[IssueSearchSection] Logout error:", error);
      // Fallback navigation if logout fails
      navigate("/login");
    }
  };

  return (
    <section className="relative w-full h-screen flex flex-col bg-[linear-gradient(135deg,rgba(248,250,252,1)_0%,rgba(239,246,255,0.3)_50%,rgba(241,245,249,1)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
      <header className="flex flex-col items-start pt-3 md:pt-4 pb-[0.67px] px-4 md:px-6 lg:px-8 bg-[#ffffffcc] border-b-[0.67px] border-[#e1e8f0] flex-shrink-0">
        <div className="flex h-10 items-center justify-between w-full">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
              <LayoutDashboardIcon className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="hidden sm:flex flex-col">
              <div className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm md:text-base leading-5 md:leading-6">
                FS Cockpit
              </div>
              <div className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                Diagnostics Platform
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 relative">
            <div className="hidden md:block [font-family:'Arial-Regular',Helvetica] font-normal text-[#45556c] text-xs leading-4">
              {user?.email || user?.username || "testadmin@ntt.com"}
            </div>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="relative"
            >
              <Avatar className="w-8 h-8 bg-[linear-gradient(135deg,rgba(43,127,255,1)_0%,rgba(173,70,255,1)_100%)] cursor-pointer hover:opacity-80 transition-opacity">
                <AvatarFallback className="bg-transparent text-white text-xs [font-family:'Arial-Regular',Helvetica]">
                  {(
                    (user?.name && user.name.charAt(0)) ||
                    (user?.email && user.email.charAt(0)) ||
                    "J"
                  ).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </button>

            {showUserMenu && (
              <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-lg border border-[#e1e8f0] py-2 z-50">
                <div className="px-4 py-2 border-b border-[#e1e8f0]">
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm">
                    Test Admin
                  </p>
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs">
                    testadmin@ntt.com
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4 text-[#61738d]" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm">
                    Sign Out
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 bg-slate-50 overflow-hidden">
        <aside className="hidden md:flex md:w-80 lg:w-96 xl:w-[420px] 2xl:w-[480px] bg-white border-r-[0.67px] border-[#e1e8f0] flex-col">
          <Tabs
            defaultValue={activeTab || "search"}
            onValueChange={setActiveTab}
            className="w-full flex flex-col flex-1 overflow-hidden"
          >
            <TabsList className="w-full h-[47px] bg-white rounded-none border-b-[0.67px] border-[#e1e8f0] p-0">
              <TabsTrigger
                value="search"
                className="flex-1 h-full rounded-none data-[state=active]:bg-[#eff6ff] data-[state=active]:border-[#155cfb] data-[state=active]:border data-[state=active]:text-[#1347e5] gap-3.5 px-[35px] py-[11px]"
              >
                <Search className="w-4 h-4" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-sm leading-5">
                  Unified Search
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="copilot"
                className="flex-1 h-full rounded-none gap-3.5 px-[82px] py-3"
              >
                <Sparkles className="w-4 h-4" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-sm leading-5">
                  Copilot
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="search"
              className="m-0 flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto">
                <div className="flex flex-col gap-4 p-3 md:p-4">
                  <div className="flex flex-col gap-1">
                    <h2 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-base leading-6">
                      Filtered Results
                    </h2>
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm leading-5">
                      Active and recent tickets requiring attention
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    {searchResults.length > 0 ? (
                      <Card className="border-[0.67px] border-[#e1e8f0] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] rounded-[14px]">
                        <CardHeader className="pt-3 pb-[0.67px] px-4 border-b-[0.67px] border-[#e1e8f0] bg-[linear-gradient(90deg,rgba(239,246,255,1)_0%,rgba(219,234,254,1)_100%)]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Search className="w-4 h-4" />
                              <CardTitle className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm leading-5">
                                Search Results
                              </CardTitle>
                            </div>
                            <button
                              onClick={() => {
                                clearSearchResults();
                                navigate("/issues");
                              }}
                              className="text-xs text-[#155cfb] hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                          <CardDescription className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                            {searchResults.length} result
                            {searchResults.length !== 1 ? "s" : ""} found
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <TicketsList
                            tickets={searchResults}
                            selectedTicketId={selectedTicketId || undefined}
                            onTicketClick={handleTicketClick}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-[0.67px] border-[#e1e8f0] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] rounded-[14px]">
                        <CardHeader className="pt-3 pb-[0.67px] px-4 border-b-[0.67px] border-[#e1e8f0] bg-[linear-gradient(90deg,rgba(248,250,252,1)_0%,rgba(239,246,255,1)_100%)]">
                          <div className="flex items-center gap-2">
                            <TicketIcon className="w-4 h-4" />
                            <CardTitle className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm leading-5">
                              My Tickets
                            </CardTitle>
                          </div>
                          <CardDescription className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                            Active and recent tickets requiring attention
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          {myTickets.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm">
                                No tickets assigned to you
                              </p>
                            </div>
                          ) : (
                            <TicketsList
                              tickets={myTickets}
                              selectedTicketId={selectedTicketId || undefined}
                              onTicketClick={handleTicketClick}
                            />
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="copilot"
              className="m-0 flex-1 flex flex-col overflow-hidden"
            >
              <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center gap-6 p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-lg leading-6">
                      AI Copilot
                    </h3>
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[320px]">
                      Your intelligent assistant for diagnostics and
                      troubleshooting
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#1347e5] text-sm">
                    Coming Soon
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* SEARCH BAR - FIXED AT BOTTOM */}
          <div className="flex-shrink-0 pt-3 px-3 pb-3 md:pt-4 md:px-4 md:pb-4 bg-white border-t-[0.67px] border-[#e1e8f0]">
            <div className="flex items-center gap-2 md:gap-3 w-full">
              <div className="flex-1 flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border-[0.67px] border-[#e1e8f0] shadow-[0px_1px_2px_-1px_#0000001a,0px_1px_3px_#0000001a]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={`Enter ${searchType.toLowerCase()} name or number...`}
                  className="flex-1 bg-transparent border-0 outline-none [font-family:'Arial-Regular',Helvetica] font-normal text-gray-700 text-sm leading-5"
                />
                <div className="relative">
                  <Button
                    onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                    className="h-auto px-4 py-2 rounded-[10px] shadow-[0px_6px_18px_#1f6feb1f] bg-[linear-gradient(0deg,rgba(31,111,235,1)_0%,rgba(74,163,255,1)_100%)] hover:opacity-90"
                  >
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-[13.3px]">
                      {searchType}
                    </span>
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>

                  {showSearchDropdown && (
                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-white rounded-lg shadow-lg border border-[#e1e8f0] py-1 z-50">
                      {(["User", "Device", "Ticket"] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSearchType(type);
                            setShowSearchDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors ${
                            searchType === type
                              ? "bg-blue-50 text-[#1347e5]"
                              : ""
                          }`}
                        >
                          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-sm">
                            {type}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={handleSearch}
                className="w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-colors shadow-lg"
              >
                <SearchIcon className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center pt-12 md:pt-24 lg:pt-[180px] pb-0 px-4 md:px-12 lg:px-24 xl:px-[175px] bg-slate-50 min-h-[552px]">
          {activeTab === "copilot" ? (
            <div
              className="flex flex-col items-center gap-8 translate-y-[-1rem] animate-fade-in opacity-0"
              style={{ "--animation-delay": "200ms" } as React.CSSProperties}
            >
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-blue-600" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h3 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-lg text-center leading-6">
                  AI Copilot
                </h3>
                <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[448px]">
                  Your intelligent assistant for diagnostics and troubleshooting
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#1347e5] text-sm">
                  Coming Soon
                </span>
              </div>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-8 translate-y-[-1rem] animate-fade-in opacity-0"
              style={{ "--animation-delay": "200ms" } as React.CSSProperties}
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Layers className="w-12 h-12 text-white" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h3 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-base text-center leading-6">
                  FS Cockpit
                </h3>
                <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[448px]">
                  Click on any ticket to view full details and diagnostics here.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 lg:px-8 py-2 bg-[#fffffff2] border-t-[0.67px] border-[#e1e8f0] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] min-h-[41px]">
        <div className="flex items-center gap-3 md:gap-6 flex-wrap">
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
            System Status:
          </span>
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            {systemStatuses.map((system) => (
              <div
                key={system.name}
                className="flex items-center gap-2 px-2 rounded"
              >
                <div
                  className={`w-2 h-2 ${system.color} rounded-full opacity-[0.67]`}
                />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#314157] text-xs leading-4">
                  {system.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <button className="flex items-center gap-1 transition-opacity hover:opacity-70">
          <span className="font-sans font-normal text-[#61738d] text-xs leading-4">
            Details
          </span>
          <Info className="w-4 h-4 text-[#61738d]" />
        </button>
      </footer>
    </section>
  );
};
