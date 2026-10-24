
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ==========================================
// CONFIGURATION
// ==========================================

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const TOKEN_KEY = "dubaibiz_token";
const USER_KEY = "dubaibiz_user";

// ==========================================
// TYPES
// ==========================================

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface AuthSession {
  user: AuthUser;
  token: string;
}

type AuthStatus =
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "error";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  retryVerification: () => void;
  refreshUser: () => Promise<void>;
}

interface AuthState {
  session: AuthSession | null;
  status: AuthStatus;
  error: string | null;
}

interface CurrentUserResponse {
  success: boolean;
  data?: {
    user?: unknown;
  };
  message?: string;
}

// ==========================================
// AUTH CONTEXT
// ==========================================

const AuthContext = createContext<
  AuthContextValue | undefined
>(undefined);

// ==========================================
// USER VALIDATION
// ==========================================

function isValidUser(value: unknown): value is AuthUser {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const user = value as Record<string, unknown>;

  return (
    typeof user.id === "number" &&
    Number.isSafeInteger(user.id) &&
    user.id > 0 &&
    typeof user.name === "string" &&
    user.name.trim().length > 0 &&
    typeof user.email === "string" &&
    user.email.includes("@") &&
    typeof user.role === "string" &&
    user.role.trim().length > 0
  );
}

// ==========================================
// JWT EXPIRATION
// ==========================================

function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3 || !parts[1]) {
      return null;
    }

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "="
    );

    const payload: unknown = JSON.parse(atob(padded));

    if (
      typeof payload !== "object" ||
      payload === null ||
      !("exp" in payload)
    ) {
      return null;
    }

    const expiration = (
      payload as Record<string, unknown>
    ).exp;

    if (
      typeof expiration !== "number" ||
      !Number.isFinite(expiration) ||
      expiration <= 0
    ) {
      return null;
    }

    return expiration * 1000;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const expiration = getTokenExpiration(token);

  return expiration === null || Date.now() >= expiration;
}

// ==========================================
// SESSION STORAGE
// ==========================================

function clearStoredSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
}

function saveStoredSession(session: AuthSession): void {
  sessionStorage.setItem(TOKEN_KEY, session.token);
  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(session.user)
  );
}

function readStoredSession(): AuthSession | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const userJson = sessionStorage.getItem(USER_KEY);

    if (!token || !userJson) {
      clearStoredSession();
      return null;
    }

    const parsedUser: unknown = JSON.parse(userJson);

    if (
      !isValidUser(parsedUser) ||
      isTokenExpired(token)
    ) {
      clearStoredSession();
      return null;
    }

    return {
      token,
      user: parsedUser,
    };
  } catch {
    clearStoredSession();
    return null;
  }
}

// ==========================================
// INITIAL AUTH STATE
// ==========================================

function createInitialAuthState(): AuthState {
  const session = readStoredSession();

  if (!session) {
    return {
      session: null,
      status: "unauthenticated",
      error: null,
    };
  }

  return {
    session,
    status: "checking",
    error: null,
  };
}

// ==========================================
// VERIFY SESSION WITH EXPRESS API
// ==========================================

class InvalidSessionError extends Error {
  constructor() {
    super("Your session is invalid or expired.");
    this.name = "InvalidSessionError";
  }
}

async function fetchCurrentUser(
  token: string,
  signal: AbortSignal
): Promise<AuthUser> {
  const response = await fetch(
    `${API_URL}/api/auth/me`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal,
    }
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    throw new InvalidSessionError();
  }

  if (!response.ok) {
    throw new Error(
      "The authentication server is temporarily unavailable."
    );
  }

  const result: CurrentUserResponse =
    await response.json();

  if (
    result.success !== true ||
    !isValidUser(result.data?.user)
  ) {
    throw new Error(
      "The server returned invalid account information."
    );
  }

  return result.data.user;
}

// ==========================================
// AUTH PROVIDER
// ==========================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [auth, setAuth] = useState<AuthState>(
    createInitialAuthState
  );

  const [verificationVersion, setVerificationVersion] =
    useState(0);

  const sessionVersionRef = useRef(0);

  // ========================================
  // LOGOUT
  // ========================================

  const logout = useCallback((): void => {
    sessionVersionRef.current += 1;

    clearStoredSession();

    setAuth({
      session: null,
      status: "unauthenticated",
      error: null,
    });
  }, []);

  // ========================================
  // LOGIN
  // ========================================

  const login = useCallback(
    (
      nextUser: AuthUser,
      nextToken: string
    ): void => {
      if (!isValidUser(nextUser)) {
        throw new Error(
          "Invalid user information received."
        );
      }

      if (
        typeof nextToken !== "string" ||
        isTokenExpired(nextToken)
      ) {
        throw new Error(
          "Invalid or expired authentication token."
        );
      }

      const nextSession: AuthSession = {
        user: nextUser,
        token: nextToken,
      };

      sessionVersionRef.current += 1;

      saveStoredSession(nextSession);

      setAuth({
        session: nextSession,
        status: "authenticated",
        error: null,
      });
    },
    []
  );

  // ========================================
  // RETRY VERIFICATION
  // ========================================

  const retryVerification = useCallback(() => {
    setAuth((current) => {
      if (!current.session) {
        return current;
      }

      return {
        ...current,
        status: "checking",
        error: null,
      };
    });

    setVerificationVersion(
      (current) => current + 1
    );
  }, []);

  // ========================================
  // VERIFY RESTORED SESSION
  // ========================================

  useEffect(() => {
    if (
      auth.status !== "checking" ||
      !auth.session
    ) {
      return;
    }

    const token = auth.session.token;
    const version = sessionVersionRef.current;
    const controller = new AbortController();

    async function verify() {
      try {
        const verifiedUser =
          await fetchCurrentUser(
            token,
            controller.signal
          );

        if (
          controller.signal.aborted ||
          sessionVersionRef.current !== version
        ) {
          return;
        }

        const verifiedSession: AuthSession = {
          token,
          user: verifiedUser,
        };

        saveStoredSession(verifiedSession);

        setAuth({
          session: verifiedSession,
          status: "authenticated",
          error: null,
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          sessionVersionRef.current !== version
        ) {
          return;
        }

        if (error instanceof InvalidSessionError) {
          logout();
          return;
        }

        if (isTokenExpired(token)) {
          logout();
          return;
        }

        setAuth((current) => {
          if (current.session?.token !== token) {
            return current;
          }

          return {
            ...current,
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Unable to verify your session.",
          };
        });
      }
    }

    void verify();

    return () => {
      controller.abort();
    };
  }, [
    auth.status,
    auth.session,
    verificationVersion,
    logout,
  ]);

  // ========================================
  // AUTOMATIC TOKEN EXPIRATION
  // ========================================

  useEffect(() => {
    if (!auth.session) {
      return;
    }

    const token = auth.session.token;
    const expiration = getTokenExpiration(token);

    if (expiration === null) {
      logout();
      return;
    }

    const remaining = expiration - Date.now();

    if (remaining <= 0) {
      logout();
      return;
    }

    const timeout = window.setTimeout(() => {
      if (isTokenExpired(token)) {
        logout();
      }
    }, Math.min(remaining, 2_147_483_647));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [auth.session, logout]);

  // ========================================
  // REFRESH CURRENT USER
  // ========================================

  const refreshUser = useCallback(
    async (): Promise<void> => {
      const currentSession = auth.session;

      if (!currentSession) {
        throw new Error("Please log in again.");
      }

      if (isTokenExpired(currentSession.token)) {
        logout();
        throw new InvalidSessionError();
      }

      const version = sessionVersionRef.current;

      let verifiedUser: AuthUser;

      try {
        verifiedUser = await fetchCurrentUser(
          currentSession.token,
          new AbortController().signal
        );
      } catch (error) {
        if (
          error instanceof InvalidSessionError &&
          sessionVersionRef.current === version
        ) {
          logout();
        }

        throw error;
      }

      if (sessionVersionRef.current !== version) {
        return;
      }

      const updatedSession: AuthSession = {
        token: currentSession.token,
        user: verifiedUser,
      };

      // Only update the currently active session.
      setAuth((current) => {
        if (
          current.session?.token !== currentSession.token
        ) {
          return current;
        }

        saveStoredSession(updatedSession);

        return {
          ...current,
          session: updatedSession,
          status: "authenticated",
          error: null,
        };
      });
    },
    [auth.session, logout]
  );

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const isAuthenticated =
    auth.status === "authenticated" &&
    auth.session !== null &&
    !isTokenExpired(auth.session.token);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: auth.session?.user ?? null,
      token: auth.session?.token ?? null,
      isAuthenticated,
      isLoading: auth.status === "checking",
      authError:
        auth.status === "error"
          ? auth.error
          : null,
      login,
      logout,
      retryVerification,
      refreshUser,
    }),
    [
      auth,
      isAuthenticated,
      login,
      logout,
      retryVerification,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================
// AUTH HOOK
// ==========================================

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider."
    );
  }

  return context;
}
