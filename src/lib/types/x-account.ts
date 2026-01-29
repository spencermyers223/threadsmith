// X Account types for multi-account support

export interface XAccount {
  id: string;
  user_id: string;
  x_user_id: string;
  x_username: string;
  x_display_name: string | null;
  x_profile_image_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface XAccountWithStats extends XAccount {
  post_count?: number;
  scheduled_count?: number;
  last_post_at?: string | null;
}

// For creating a new X account connection
export interface CreateXAccountInput {
  x_user_id: string;
  x_username: string;
  x_display_name?: string;
  x_profile_image_url?: string;
  is_primary?: boolean;
}

// For updating X account settings
export interface UpdateXAccountInput {
  x_display_name?: string;
  x_profile_image_url?: string;
  is_primary?: boolean;
}

// Account context state
export interface XAccountContextState {
  accounts: XAccount[];
  activeAccount: XAccount | null;
  isLoading: boolean;
  error: string | null;
}

// Account context actions
export interface XAccountContextActions {
  setActiveAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
  addAccount: (account: XAccount) => void;
  removeAccount: (accountId: string) => void;
}

export type XAccountContext = XAccountContextState & XAccountContextActions;
