/**
 * AppHeader Component
 *
 * Main application header displaying branding and user account menu.
 * Provides app logo, title, user email, avatar with initials, and logout functionality.
 *
 * Features:
 * - FS Cockpit branding with icon and subtitle
 * - User avatar with auto-generated initials from name or email
 * - Dropdown user menu with account details and sign out
 * - Responsive header with consistent height
 * - Click-outside to close menu (via parent component state)
 *
 * @example
 * <AppHeader
 *   userEmail="john.doe@company.com"
 *   userName="John Doe"
 *   showUserMenu={showMenu}
 *   setShowUserMenu={setShowMenu}
 *   onLogout={() => handleLogout()}
 * />
 */
import React from "react";
import { LogOutIcon } from "lucide-react";

/**
 * Props for the AppHeader component
 *
 * @interface AppHeaderProps
 */
interface AppHeaderProps {
  /** User's email address */
  userEmail: string;
  /** User's display name */
  userName: string;
  /** Whether user menu dropdown is visible */
  showUserMenu: boolean;
  /** Callback to toggle user menu visibility */
  setShowUserMenu: (show: boolean) => void;
  /** Callback fired when user clicks Sign Out */
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  userEmail,
  userName,
  showUserMenu,
  setShowUserMenu,
  onLogout,
}) => {
  /**
   * Generate user initials from name or email
   * @param {string} name - User's full name
   * @param {string} email - User's email address
   * @returns {string} Single uppercase initial character
   */
  const getInitials = (name: string, email: string) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return "J";
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E7EB] flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-[#3B82F6]">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"
              fill="white"
            />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="[font-family:'Arial-Regular',Helvetica] text-base font-medium text-[#0E162B]">
            FS Cockpit
          </div>
          <div className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#6B7280]">
            Diagnostics Platform
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 relative">
        <div className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#6B7280]">
          {userEmail}
        </div>
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="relative"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#3B82F6] cursor-pointer hover:opacity-80 transition-opacity">
            <span className="[font-family:'Arial-Regular',Helvetica] text-white text-xs font-medium">
              {getInitials(userName, userEmail)}
            </span>
          </div>
        </button>
        {showUserMenu && (
          <div className="absolute top-12 right-0 w-48 bg-white rounded-lg shadow-lg border border-[#E5E7EB] py-2 z-50">
            <div className="px-4 py-2 border-b border-[#E5E7EB]">
              <p className="[font-family:'Arial-Regular',Helvetica] text-sm text-[#0E162B] font-medium">
                {userName}
              </p>
              <p className="[font-family:'Arial-Regular',Helvetica] text-xs text-[#6B7280]">
                {userEmail}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="w-full px-4 py-2 text-left [font-family:'Arial-Regular',Helvetica] text-sm text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2"
            >
              <LogOutIcon className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
