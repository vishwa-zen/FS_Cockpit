import {
  ChevronDownIcon,
  InfoIcon,
  LogOutIcon,
  SearchIcon,
  AlertCircle,
  ArrowLeft,
  ServerCrash,
  SendIcon,
  Leaf,
} from "lucide-react";
import TicketsList from "../shared/TicketsList";
import TicketDetailsView from "../shared/TicketDetailsView";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../../hooks/useAuth";
import { useTickets } from "../shared/TicketsContext";
import { SystemStatusBar } from "../../../../components/SystemStatusBar";
import { Avatar, AvatarFallback } from "../../../../components/ui/avatar";
import { Button } from "../../../../components/ui/button";
import {
  CockpitEmptyStateIcon,
  CopilotIcon,
  FSCockpitLogoIcon,
  MyTicketsIcon,
} from "../../../../components/icons";
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

export const HomeSearchSection = (): JSX.Element => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const {
    myTickets,
    searchResults,
    isLoading,
    isSearching,
    error,
    selectedTicketId,
    setSelectedTicketId,
    searchTickets,
    clearSearchResults,
    activeTab,
    setActiveTab,
  } = useTickets();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [searchType, setSearchType] = useState<"User" | "Device" | "Ticket">(
    "Ticket"
  );
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [copilotMessage, setCopilotMessage] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<
    Array<{
      role: "user" | "assistant";
      content: string | JSX.Element;
      ticketId?: string;
    }>
  >([
    {
      role: "assistant",
      content:
        "👋 Welcome to FS Cockpit! I'm here to help you with diagnostics. How can I assist you today?",
    },
  ]);
  const [copilotSelectedTicketId, setCopilotSelectedTicketId] = useState<
    string | null
  >(null);

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
        await searchTickets(searchQuery, searchType);
      } catch (error) {
        console.error("Search failed:", error);
      }
    } else {
      clearSearchResults();
    }
  };

  const handleTicketClick = (ticketId: string) => {
    // Navigate to /home/:id to show ticket details on the right side
    navigate(`/home/${ticketId}`);
  };

  const handleCopilotTicketClick = (ticketId: string) => {
    setCopilotSelectedTicketId(ticketId);
    setCopilotMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Great! I've loaded the details for **${ticketId}**. You can see the full diagnostics on the right side. How can I help you with this ticket?`,
      },
    ]);
  };

  const handleCopilotSend = () => {
    if (copilotMessage.trim()) {
      const userMessage = copilotMessage.trim().toLowerCase();
      const originalMessage = copilotMessage.trim();

      // Add user message
      setCopilotMessages((prev) => [
        ...prev,
        { role: "user", content: copilotMessage },
      ]);
      setCopilotMessage("");

      // Check if user is asking for tickets
      if (
        userMessage.includes("my tickets") ||
        userMessage.includes("show tickets") ||
        userMessage.includes("get my tickets") ||
        userMessage.includes("tickets")
      ) {
        setTimeout(() => {
          setCopilotMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-[#070f26]">
                      Here are your tickets. Click on any ticket to view
                      details:
                    </p>
                    <div className="flex items-center gap-0.5">
                      <Leaf className="w-3.5 h-3.5 text-[#00a63e] fill-[#00a63e]" />
                      <Leaf className="w-3.5 h-3.5 text-[#00a63e] fill-[#00a63e]" />
                      <Leaf className="w-3.5 h-3.5 text-[#00a63e] fill-[#00a63e]" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {myTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleCopilotTicketClick(ticket.id)}
                        className="p-3 bg-white border border-[#e1e8f0] rounded-lg hover:bg-[#f8fafc] cursor-pointer transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-medium text-sm text-[#155cfb]">
                            {ticket.id}
                          </span>
                          <div className="flex gap-1.5">
                            {ticket.priorityColor && ticket.priority && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${ticket.priorityColor}`}
                              >
                                {ticket.priority}
                              </span>
                            )}
                            {ticket.statusColor && ticket.status && (
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${ticket.statusColor}`}
                              >
                                {ticket.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[#5876ab] line-clamp-2">
                          {ticket.title}
                        </p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-[#90a1b8]">
                          {ticket.device && (
                            <span className="flex items-center gap-1">
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <rect
                                  x="2"
                                  y="3"
                                  width="20"
                                  height="14"
                                  rx="2"
                                  strokeWidth="2"
                                />
                                <line
                                  x1="8"
                                  y1="21"
                                  x2="16"
                                  y2="21"
                                  strokeWidth="2"
                                />
                                <line
                                  x1="12"
                                  y1="17"
                                  x2="12"
                                  y2="21"
                                  strokeWidth="2"
                                />
                              </svg>
                              {ticket.device}
                            </span>
                          )}
                          {ticket.time && <span>• {ticket.time}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
          ]);
        }, 500);
      }
      // Check if user wants to search by device
      else if (
        userMessage.includes("search device") ||
        userMessage.includes("find device") ||
        userMessage.includes("device:")
      ) {
        const deviceMatch =
          originalMessage.match(/device[:\s]+(\S+)/i) ||
          originalMessage.match(/(?:search|find)\s+device\s+(\S+)/i);
        if (deviceMatch && deviceMatch[1]) {
          const deviceName = deviceMatch[1];
          setCopilotMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🔍 Searching for tickets related to device **${deviceName}**...`,
            },
          ]);

          searchTickets(deviceName, "Device").then(() => {
            setTimeout(() => {
              setCopilotMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    searchResults.length > 0
                      ? `Found ${searchResults.length} ticket(s) for device **${deviceName}**. Check the results on the left.`
                      : `No tickets found for device **${deviceName}**. Try a different device name.`,
                },
              ]);
            }, 800);
          });
        } else {
          setTimeout(() => {
            setCopilotMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  "Please specify a device name. For example: 'search device LAPTOP-123' or 'device: LAPTOP-123'",
              },
            ]);
          }, 500);
        }
      }
      // Check if user wants to search by username
      else if (
        userMessage.includes("search user") ||
        userMessage.includes("find user") ||
        userMessage.includes("user:") ||
        userMessage.includes("username:")
      ) {
        const userMatch =
          originalMessage.match(/(?:user|username)[:\s]+(\S+)/i) ||
          originalMessage.match(/(?:search|find)\s+user\s+(\S+)/i);
        if (userMatch && userMatch[1]) {
          const userName = userMatch[1];
          setCopilotMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🔍 Searching for tickets assigned to user **${userName}**...`,
            },
          ]);

          searchTickets(userName, "User").then(() => {
            setTimeout(() => {
              setCopilotMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content:
                    searchResults.length > 0
                      ? `Found ${searchResults.length} ticket(s) for user **${userName}**. Check the results on the left.`
                      : `No tickets found for user **${userName}**. Try a different username.`,
                },
              ]);
            }, 800);
          });
        } else {
          setTimeout(() => {
            setCopilotMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content:
                  "Please specify a username. For example: 'search user john.doe' or 'user: john.doe'",
              },
            ]);
          }, 500);
        }
      }
      // Check if user typed a ticket number (search by incident)
      else if (userMessage.match(/inc\d{7}/i)) {
        const ticketMatch = userMessage.match(/inc\d{7}/i);
        if (ticketMatch) {
          const ticketId = ticketMatch[0].toUpperCase();
          setCopilotMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `🔍 Searching for ticket **${ticketId}**...`,
            },
          ]);

          searchTickets(ticketId, "Ticket").then(() => {
            setTimeout(() => {
              const ticket =
                searchResults.find((t) => t.id === ticketId) ||
                myTickets.find((t) => t.id === ticketId);
              if (ticket) {
                handleCopilotTicketClick(ticketId);
              } else {
                setCopilotMessages((prev) => [
                  ...prev,
                  {
                    role: "assistant",
                    content: `I couldn't find ticket **${ticketId}**. Please verify the ticket number and try again.`,
                  },
                ]);
              }
            }, 800);
          });
        }
      }
      // General response
      else {
        setTimeout(() => {
          const responses = [
            "I can help you search for tickets! Try:\n• Type a ticket number (e.g., INC0012345)\n• Search by device: 'search device LAPTOP-123'\n• Search by user: 'search user john.doe'\n• Or ask to 'show my tickets'",
            "I'm here to assist with IT diagnostics. You can:\n• Type 'show my tickets' to see your assigned tickets\n• Enter a ticket number like INC0012345\n• Search by device or username",
            "How can I help you today? You can:\n• Ask to see your tickets\n• Search by incident number (INC0012345)\n• Search by device name\n• Search by username",
          ];
          const randomResponse =
            responses[Math.floor(Math.random() * responses.length)];
          setCopilotMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: randomResponse,
            },
          ]);
        }, 500);
      }
    }
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

        <div className="flex items-center gap-2 md:gap-3 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:200ms]">
          <span className="hidden md:inline [font-family:'Arial-Regular',Helvetica] font-normal text-[#45556c] text-xs leading-4">
            {user?.email || user?.username || "testadmin@ntt.com"}
          </span>

          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="relative focus:outline-none z-50"
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
        </div>

        {showUserMenu && !isLoggingOut && (
          <>
            {/* Overlay for outside click detection */}
            <div
              className="fixed inset-0 z-40"
              aria-hidden="true"
              onClick={() => setShowUserMenu(false)}
            />
            <div className="fixed top-[73px] right-8 w-48 bg-white rounded-lg shadow-lg border border-[#e1e8f0] py-2 z-50">
              <div className="px-4 py-2 border-b border-[#e1e8f0]">
                <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm">
                  {user?.name || "Test Admin"}
                </p>
                <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs">
                  {user?.email || user?.username || "testadmin@ntt.com"}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  setShowUserMenu(false);
                  setIsLoggingOut(true);
                  try {
                    await logout();
                  } catch (error) {
                    console.error("Logout error:", error);
                  } finally {
                    navigate("/login");
                  }
                }}
                className="w-full px-4 py-2 text-left hover:bg-slate-50 transition-colors flex items-center gap-2 cursor-pointer border-0 bg-transparent"
              >
                <LogOutIcon className="w-4 h-4 text-[#61738d]" />
                <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm">
                  Sign Out
                </span>
              </button>
            </div>
          </>
        )}
      </header>

      <div className="flex flex-1 bg-slate-50 overflow-hidden">
        {/* Show sidebar on desktop, hide on mobile when ticket is selected */}
        <aside
          className={`${
            selectedTicketId ? "hidden md:flex" : "flex"
          } w-full md:w-80 lg:w-96 xl:w-[420px] 2xl:w-[480px] bg-white border-r-[0.67px] border-[#e1e8f0] flex-col`}
        >
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
                  <CardHeader
                    className={`h-[65px] py-3 px-4 border-b-[0.67px] border-[#e1e8f0] flex flex-col gap-0.5 justify-between ${
                      isSearching || searchResults.length > 0
                        ? "bg-[linear-gradient(90deg,rgba(239,246,255,1)_0%,rgba(219,234,254,1)_100%)]"
                        : "bg-[linear-gradient(90deg,rgba(248,250,252,1)_0%,rgba(239,246,255,1)_100%)]"
                    }`}
                  >
                    {isSearching || searchResults.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <SearchIcon className="w-4 h-4" />
                            <CardTitle className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm leading-5">
                              Search Results
                            </CardTitle>
                          </div>
                          <button
                            onClick={() => {
                              clearSearchResults();
                              navigate("/home");
                            }}
                            className="text-xs text-[#155cfb] hover:underline font-sans"
                          >
                            Clear
                          </button>
                        </div>
                        {isSearching ? (
                          <CardDescription className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4 flex items-center gap-1">
                            <span className="animate-spin inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full" />
                            Searching...
                          </CardDescription>
                        ) : (
                          <CardDescription className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                            {searchResults.length} result
                            {searchResults.length !== 1 ? "s" : ""} found
                          </CardDescription>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <MyTicketsIcon />
                          <CardTitle className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#0e162b] text-sm leading-5">
                            My Tickets
                          </CardTitle>
                        </div>
                        <CardDescription className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-xs leading-4">
                          Quick access to tickets assigned to you.
                        </CardDescription>
                      </>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {isSearching ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="font-sans font-normal text-[#61738d] text-sm mt-2">
                          Searching...
                        </p>
                      </div>
                    ) : isLoading ? (
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
                    ) : isSearching || searchResults.length > 0 ? (
                      isSearching ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                          <p className="font-sans font-normal text-[#61738d] text-sm mt-2">
                            Searching...
                          </p>
                        </div>
                      ) : (
                        <TicketsList
                          tickets={searchResults}
                          selectedTicketId={selectedTicketId || undefined}
                          onTicketClick={handleTicketClick}
                        />
                      )
                    ) : myTickets.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="font-sans font-normal text-[#61738d] text-sm">
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
              </div>
            </TabsContent>

            <TabsContent
              value="copilot"
              className="mt-0 p-0 flex-1 overflow-y-auto"
            >
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
                  {copilotMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0">
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M0 10C0 4.47715 4.47715 0 10 0H22C27.5228 0 32 4.47715 32 10V22C32 27.5228 27.5228 32 22 32H10C4.47715 32 0 27.5228 0 22V10Z"
                              fill="url(#paint0_linear_1_1382)"
                            />
                            <g clipPath="url(#clip0_1_1382)">
                              <path
                                d="M15.3447 9.87605C15.3732 9.72312 15.4544 9.58499 15.5741 9.4856C15.6937 9.3862 15.8444 9.33179 16 9.33179C16.1556 9.33179 16.3062 9.3862 16.4259 9.4856C16.5456 9.58499 16.6268 9.72312 16.6553 9.87605L17.356 13.5814C17.4058 13.8448 17.5338 14.0871 17.7233 14.2767C17.9129 14.4663 18.1552 14.5943 18.4187 14.6441L22.124 15.3447C22.2769 15.3733 22.415 15.4544 22.5144 15.5741C22.6138 15.6938 22.6683 15.8445 22.6683 16.0001C22.6683 16.1556 22.6138 16.3063 22.5144 16.426C22.415 16.5457 22.2769 16.6268 22.124 16.6554L18.4187 17.3561C18.1552 17.4058 17.9129 17.5338 17.7233 17.7234C17.5338 17.913 17.4058 18.1553 17.356 18.4187L16.6553 22.1241C16.6268 22.277 16.5456 22.4151 16.4259 22.5145C16.3062 22.6139 16.1556 22.6683 16 22.6683C15.8444 22.6683 15.6937 22.6139 15.5741 22.5145C15.4544 22.4151 15.3732 22.277 15.3447 22.1241L14.644 18.4187C14.5942 18.1553 14.4662 17.913 14.2766 17.7234C14.0871 17.5338 13.8448 17.4058 13.5813 17.3561L9.87599 16.6554C9.72306 16.6268 9.58493 16.5457 9.48553 16.426C9.38614 16.3063 9.33173 16.1556 9.33173 16.0001C9.33173 15.8445 9.38614 15.6938 9.48553 15.5741C9.58493 15.4544 9.72306 15.3733 9.87599 15.3447L13.5813 14.6441C13.8448 14.5943 14.0871 14.4663 14.2766 14.2767C14.4662 14.0871 14.5942 13.8448 14.644 13.5814L15.3447 9.87605Z"
                                stroke="white"
                                strokeWidth="1.33333"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M21.3333 9.33325V11.9999"
                                stroke="white"
                                strokeWidth="1.33333"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M22.6667 10.6667H20"
                                stroke="white"
                                strokeWidth="1.33333"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M10.6666 22.6667C11.403 22.6667 12 22.0697 12 21.3333C12 20.597 11.403 20 10.6666 20C9.93027 20 9.33331 20.597 9.33331 21.3333C9.33331 22.0697 9.93027 22.6667 10.6666 22.6667Z"
                                stroke="white"
                                strokeWidth="1.33333"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </g>
                            <defs>
                              <linearGradient
                                id="paint0_linear_1_1382"
                                x1="0"
                                y1="0"
                                x2="32"
                                y2="32"
                                gradientUnits="userSpaceOnUse"
                              >
                                <stop stopColor="#AD46FF" />
                                <stop offset="1" stopColor="#F6339A" />
                              </linearGradient>
                              <clipPath id="clip0_1_1382">
                                <rect
                                  width="16"
                                  height="16"
                                  fill="white"
                                  transform="translate(8 8)"
                                />
                              </clipPath>
                            </defs>
                          </svg>
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-[#155cfb] text-white"
                            : "bg-white border border-[#e1e8f0] text-[#070f26]"
                        }`}
                      >
                        {typeof message.content === "string" ? (
                          <p className="text-sm leading-6 whitespace-pre-wrap">
                            {message.content}
                          </p>
                        ) : (
                          message.content
                        )}
                      </div>
                      {message.role === "user" && (
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-[#155cfb] text-white text-xs">
                            {user?.name?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex-shrink-0 pt-3 px-3 pb-3 md:pt-4 md:px-4 md:pb-4 bg-white border-t-[0.67px] border-[#e1e8f0]">
            {activeTab === "copilot" ? (
              <div className="flex items-center gap-2 md:gap-3 w-full">
                <div className="flex-1 flex items-center gap-3 px-3 py-2.5 bg-white rounded-lg border-[0.67px] border-[#e1e8f0] shadow-[0px_1px_2px_-1px_#0000001a,0px_1px_3px_#0000001a]">
                  <Input
                    value={copilotMessage}
                    onChange={(e) => setCopilotMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCopilotSend()}
                    placeholder="Type ticket number, device name, username, or ask for 'my tickets'..."
                    className="border-0 shadow-none p-0 h-auto [font-family:'Arial-Regular',Helvetica] font-normal text-[#717182] text-xs placeholder:text-[#717182] focus-visible:ring-0"
                  />
                </div>
                <Button
                  size="icon"
                  onClick={handleCopilotSend}
                  disabled={!copilotMessage.trim()}
                  className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SendIcon className="w-5 h-5 text-white" />
                </Button>
              </div>
            ) : (
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
                      onClick={() => {
                        setShowSearchDropdown(!showSearchDropdown);
                      }}
                      className="h-auto px-4 py-2 rounded-[10px] shadow-[0px_6px_18px_#1f6feb1f] bg-[linear-gradient(0deg,rgba(31,111,235,1)_0%,rgba(74,163,255,1)_100%)] hover:opacity-90 transition-opacity"
                    >
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-[13.3px] leading-normal">
                        {searchType}
                      </span>
                      <ChevronDownIcon className="w-4 h-4 ml-2" />
                    </Button>

                    {showSearchDropdown && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowSearchDropdown(false)}
                        />
                        <div className="absolute bottom-full right-0 mb-2 w-32 bg-white rounded-lg shadow-lg border border-[#e1e8f0] py-1 z-50">
                          {(["User", "Device", "Ticket"] as const).map(
                            (type) => (
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
                            )
                          )}
                        </div>
                      </>
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
            )}
          </div>
        </aside>

        <main
          className={`${
            selectedTicketId ? "flex" : "hidden md:flex"
          } flex-1 bg-slate-50 min-h-[552px] overflow-hidden`}
        >
          {activeTab === "copilot" ? (
            copilotSelectedTicketId ? (
              (() => {
                const selectedTicket = myTickets.find(
                  (t) => t.id === copilotSelectedTicketId
                );
                return selectedTicket ? (
                  <TicketDetailsView
                    ticket={selectedTicket}
                    showSustainabilityScore={true}
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="flex flex-col items-center justify-center gap-8 translate-y-[-1rem]">
                      <CockpitEmptyStateIcon />
                      <div className="flex flex-col items-center gap-2">
                        <h2 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-base text-center leading-6">
                          Copilot
                        </h2>
                        <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[448px]">
                          Ask me to show your tickets or provide a ticket number
                          for diagnostics.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="flex flex-col items-center justify-center gap-8 translate-y-[-1rem]">
                  <CockpitEmptyStateIcon />
                  <div className="flex flex-col items-center gap-2">
                    <h2 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-base text-center leading-6">
                      Copilot
                    </h2>
                    <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[448px]">
                      Ask me to show your tickets or provide a ticket number for
                      diagnostics.
                    </p>
                  </div>
                </div>
              </div>
            )
          ) : selectedTicketId ? (
            (() => {
              // Check both myTickets and searchResults for the selected ticket
              const allTickets = [...myTickets, ...searchResults];
              const selectedTicket = allTickets.find(
                (t) => t.id === selectedTicketId
              );

              // If ticket found, show details
              if (selectedTicket) {
                return <TicketDetailsView ticket={selectedTicket} />;
              }

              // If error exists and no tickets loaded, backend is unavailable
              if (
                error &&
                myTickets.length === 0 &&
                searchResults.length === 0
              ) {
                return (
                  <div className="flex items-center justify-center w-full h-full">
                    <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-md">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
                        <ServerCrash className="w-10 h-10 text-[#d97706]" />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <h3 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-lg text-center leading-6">
                          Service Unavailable
                        </h3>
                        <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5">
                          Unable to connect to the backend service. Please check
                          if the API server is running or try again later.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          navigate("/home");
                          window.location.reload();
                        }}
                        className="h-auto px-6 py-3 rounded-lg bg-[#155cfb] hover:bg-[#1250dc] gap-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-sm">
                          Retry
                        </span>
                      </Button>
                    </div>
                  </div>
                );
              }

              // Otherwise, ticket not found
              return (
                <div className="flex items-center justify-center w-full h-full">
                  <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-md">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
                      <AlertCircle className="w-10 h-10 text-[#d32f2f]" />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <h3 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-lg text-center leading-6">
                        Ticket Not Found
                      </h3>
                      <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5">
                        The ticket you're looking for could not be found. It may
                        have been removed or you may not have access to it.
                      </p>
                    </div>
                    <Button
                      onClick={() => navigate("/home")}
                      className="h-auto px-6 py-3 rounded-lg bg-[#155cfb] hover:bg-[#1250dc] gap-2"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="[font-family:'Arial-Regular',Helvetica] font-normal text-white text-sm">
                        Back to Tickets
                      </span>
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="flex flex-col items-center justify-center gap-8 translate-y-[-1rem] animate-fade-in opacity-0 [--animation-delay:800ms]">
                <CockpitEmptyStateIcon />
                <div className="flex flex-col items-center gap-2">
                  <h2 className="[font-family:'Arial-Bold',Helvetica] font-bold text-[#314157] text-base text-center leading-6">
                    Cockpit
                  </h2>
                  <p className="[font-family:'Arial-Regular',Helvetica] font-normal text-[#61738d] text-sm text-center leading-5 max-w-[448px]">
                    Search for a device, user, or ticket to begin diagnostics.
                    Results and insights will be displayed here.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <SystemStatusBar />
    </section>
  );
};
