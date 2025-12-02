import {
  ChevronDownIcon,
  ClockIcon,
  InfoIcon,
  LogOutIcon,
  MonitorIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import TicketsList from "../shared/TicketsList";
import TicketDetailsView from "../shared/TicketDetailsView";
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import { useTickets } from "../shared/TicketsContext";
// systemStatusAPI is not used in this component; use systemStatusData constant instead
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { CockpitEmptyStateIcon, CopilotIcon, FSCockpitLogoIcon, MyTicketsIcon } from "../../../../components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Input } from "../../../../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { ScrollArea } from "../../../../components/ui/scroll-area";

const systemStatusData = [
  { name: "ServiceNow", status: "operational", color: "bg-[#00c950]" },
  { name: "Nexthink", status: "degraded", color: "bg-[#f0b100]" },
  { name: "Intune / SCCM", status: "operational", color: "bg-[#00c950]" },
];

export const HomeSearchSection = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    tickets,
    isLoading,
    error,
    selectedTicketId,
    setSelectedTicketId,
    fetchTickets,
    searchTickets,
    activeTab,
    setActiveTab,
  } = useTickets();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchType, setSearchType] = useState<"User" | "Device" | "Ticket">(
    "Ticket"
  );
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  // activeTab, loading/error and selectedTicketId are derived from TicketsContext
  // Note: tickets are already fetched by TicketsContext on mount, no need to fetch again

  // Update selected ticket when URL parameter changes
  useEffect(() => {
    if (id) {
      setSelectedTicketId(id);
    } else {
      setSelectedTicketId(null);
    }
  }, [id, setSelectedTicketId]);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      try {
        const results = await searchTickets(searchQuery, searchType);
        if (results && results.length > 0) {
          navigate(`/issue/${results[0].id}`);
        }
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else {
      // Reload all tickets
      fetchTickets();
    }
  };

  const handleTicketClick = (ticketId: string) => {
    // Navigate to /home/:id to show ticket details on the right side
    navigate(`/home/${ticketId}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <section className="relative w-full h-screen flex flex-col bg-[linear-gradient(135deg,rgba(248,250,252,1)_0%,rgba(239,246,255,0.3)_50%,rgba(241,245,249,1)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
      <header className="flex items-center justify-between px-8 pt-4 pb-0 h-[73px] bg-[#ffffffcc] border-b-[0.67px] border-[#e1e8f0] flex-shrink-0">
        <div className="flex items-start gap-2 md:gap-3 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:0ms]">
          <div className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center">
            <FSCockpitLogoIcon />
          </div>
          <div className="hidden sm:flex flex-col justify-between py-0.5">
            <h1 className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm md:text-base leading-5 md:leading-6">
              FS Cockpit
            </h1>
            <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
              Diagnostics Platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms] relative">
          <span className="hidden md:inline [font-family:'Arial-Regular',Helvetica] font-normal text-[#45556c] text-xs leading-4">
            {user?.email || user?.username || "john.doe@company.com"}
          </span>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="relative"
          >
            <Avatar className="w-8 h-8 bg-[linear-gradient(135deg,rgba(43,127,255,1)_0%,rgba(173,70,255,1)_100%)] cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarFallback className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-xs bg-transparent">
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
                  {user?.name || "John Doe"}
                </p>
                <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs">
                  {user?.email || user?.username || "john.doe@company.com"}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <LogOutIcon className="w-4 h-4 text-[#61738d]" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm">
                  Sign Out
                </span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 bg-slate-50 overflow-hidden">
        <aside className="w-full md:w-80 lg:w-96 xl:w-[420px] 2xl:w-[480px] bg-white border-r-[0.67px] border-[#e1e8f0] flex flex-col">
          <Tabs
            defaultValue={activeTab || "unified-search"}
            onValueChange={setActiveTab}
            className="w-full flex flex-col flex-1 overflow-hidden"
          >
            <TabsList className="w-full h-[47px] rounded-none bg-white border-b-[0.67px] border-[#e1e8f0] p-0 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:400ms]">
              <TabsTrigger
                value="unified-search"
                className="flex-1 h-full rounded-none data-[state=active]:bg-[#eff6ff] data-[state=active]:border-2 data-[state=active]:border-[#155cfb] data-[state=active]:text-[#1347e5] gap-3.5 transition-colors"
              >
                <SearchIcon className="w-4 h-4" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-sm leading-5">
                  Unified Search
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="copilot"
                className="flex-1 h-full rounded-none data-[state=active]:bg-[#eff6ff] data-[state=active]:border-2 data-[state=active]:border-[#155cfb] data-[state=active]:text-[#1347e5] gap-3.5 transition-colors"
              >
                <CopilotIcon />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-neutral-950 text-sm leading-5">
                  Copilot
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="unified-search"
              className="mt-0 p-0 flex-1 overflow-y-auto"
            >
              <div className="p-3 md:p-4 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:600ms]">
                <Card className="border-[0.67px] border-[#e1e8f0] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] rounded-[14px]">
                  <CardHeader className="h-[65px] py-3 px-4 border-b-[0.67px] border-[#e1e8f0] bg-[linear-gradient(90deg,rgba(248,250,252,1)_0%,rgba(239,246,255,1)_100%)] flex flex-col gap-0.5 justify-between">
                    <div className="flex items-center gap-2">
                      <MyTicketsIcon />
                      <CardTitle className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm leading-5">
                        My Tickets
                      </CardTitle>
                    </div>
                    <CardDescription className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                      Quick access to tickets assigned to you.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="font-sans font-normal text-[#61738d] text-sm mt-2">
                          Loading tickets...
                        </p>
                      </div>
                    ) : error ? (
                      <div className="text-center py-8">
                        <p className="font-sans font-normal text-red-600 text-sm">
                          {error}
                        </p>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="font-sans font-normal text-[#61738d] text-sm">
                          No tickets found
                        </p>
                      </div>
                    ) : (
                      <TicketsList
                        tickets={tickets}
                        selectedTicketId={selectedTicketId || undefined}
                        onTicketClick={handleTicketClick}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent
              value="copilot"
              className="mt-0 p-0 flex-1 overflow-y-auto"
            >
              <div className="h-full flex flex-col items-center justify-center gap-6 p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <CopilotIcon />
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

          <div className="flex-shrink-0 pt-3 px-3 pb-3 md:pt-4 md:px-4 md:pb-4 bg-white border-t-[0.67px] border-[#e1e8f0]">
            <div className="flex items-center gap-2 md:gap-3 w-full">
              <div className="flex-1 flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border-[0.67px] border-[#e1e8f0] shadow-[0px_1px_2px_-1px_#0000001a,0px_1px_3px_#0000001a]">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={`Enter ${searchType.toLowerCase()} name or number...`}
                  className="border-0 shadow-none p-0 h-auto [font-family:'Arial-Regular',Helvetica] font-normal text-[#717182] text-xs placeholder:text-[#717182] focus-visible:ring-0"
                />
                <div className="relative">
                  <Button
                    onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                    className="h-auto px-4 py-2 rounded-[10px] shadow-[0px_6px_18px_#1f6feb1f] bg-[linear-gradient(0deg,rgba(31,111,235,1)_0%,rgba(74,163,255,1)_100%)] hover:opacity-90 transition-opacity"
                  >
                    <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-[13.3px] leading-normal">
                      {searchType}
                    </span>
                    <ChevronDownIcon className="w-4 h-4 ml-2" />
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
              <Button
                size="icon"
                onClick={handleSearch}
                className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-colors shadow-lg"
              >
                <SearchIcon className="w-5 h-5 text-white" />
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-slate-50 min-h-[552px] overflow-hidden">
          {activeTab === "copilot" ? (
            <div className="flex flex-col items-center justify-center h-full gap-8 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms]">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <CopilotIcon />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h2 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-lg text-center leading-6">
                  AI Copilot
                </h2>
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
          ) : selectedTicketId ? (
            (() => {
              const selectedTicket = tickets.find(t => t.id === selectedTicketId);
              return selectedTicket ? (
                <TicketDetailsView ticket={selectedTicket} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm">
                    Ticket not found
                  </p>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-8 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms]">
              <CockpitEmptyStateIcon />
              <div className="flex flex-col items-center gap-2">
                <h2 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-base text-center leading-6">
                  Cockpit
                </h2>
                <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[448px]">
                  Search for a device, user, or ticket to begin diagnostics. Results and insights will be displayed here.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <footer className="flex-shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 lg:px-8 py-2 md:py-2 bg-[#fffffff2] border-t-[0.67px] border-[#e1e8f0] shadow-[0px_4px_6px_-4px_#0000001a,0px_10px_15px_-3px_#0000001a] min-h-[41px]">
        <div className="flex items-center gap-3 md:gap-6 flex-wrap">
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
            System Status:
          </span>
          <div className="flex items-center gap-3 md:gap-6 flex-wrap">
            {systemStatusData.map((system, index) => (
              <div
                key={`system-${index}`}
                className="flex items-center gap-2 px-2 py-0 rounded"
              >
                <div
                  className={`w-2 h-2 ${system.color} rounded-full opacity-[0.98]`}
                />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#314157] text-xs leading-4">
                  {system.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Button
          variant="ghost"
          className="h-auto p-0 hover:bg-transparent gap-1 transition-colors"
        >
          <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
            Details
          </span>
          <InfoIcon className="w-4 h-4 text-[#61738d]" />
        </Button>
      </footer>
    </section>
  );
};
