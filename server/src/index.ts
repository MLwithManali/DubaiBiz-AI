
import "dotenv/config";

import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import cors from "cors";

// ==========================================
// ROUTE IMPORTS
// ==========================================

import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import leadRoutes from "./routes/leadRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import assistantRoutes from "./routes/assistantRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

import { requireAuth } from "./middleware/authMiddleware.js";

// ==========================================
// APPLICATION CONFIGURATION
// ==========================================

const app = express();

app.disable("x-powered-by");

const PORT = Number(process.env.PORT ?? 5000);

const CLIENT_URL =
  process.env.CLIENT_URL ??
  "http://localhost:5173";

if (
  !Number.isSafeInteger(PORT) ||
  PORT < 1 ||
  PORT > 65535
) {
  throw new Error(
    "Invalid server PORT configuration."
  );
}

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32
) {
  throw new Error(
    "JWT_SECRET must contain at least 32 characters."
  );
}

// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(
  cors({
    origin: CLIENT_URL,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
    credentials: false,
  })
);

// Parse incoming JSON requests.
app.use(
  express.json({
    limit: "100kb",
    strict: true,
  })
);

// Prevent caching sensitive API responses.
app.use(
  (
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    res.setHeader(
      "Cache-Control",
      "no-store"
    );

    next();
  }
);

// ==========================================
// HEALTH CHECK
// ==========================================

app.get(
  "/api/health",
  (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message:
        "DubaiBiz AI API is running.",
    });
  }
);

// ==========================================
// PUBLIC AUTHENTICATION ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

// ==========================================
// PROTECTED CUSTOMER ROUTES
// ==========================================

app.use(
  "/api/customers",
  requireAuth,
  customerRoutes
);

// ==========================================
// PROTECTED LEAD ROUTES
// ==========================================

app.use(
  "/api/leads",
  requireAuth,
  leadRoutes
);

// ==========================================
// PROTECTED AI CLASSIFICATION ROUTES
// ==========================================

app.use(
  "/api/ai",
  requireAuth,
  aiRoutes
);

// ==========================================
// PROTECTED CRM ASSISTANT ROUTES
// ==========================================

app.use(
  "/api/assistant",
  requireAuth,
  assistantRoutes
);

// ==========================================
// ADMIN-ONLY ROUTES
// ==========================================

// adminRoutes.ts applies:
// requireAuth -> requireAdmin
//
// Both checks run before admin controllers.

app.use(
  "/api/admin",
  adminRoutes
);

// ==========================================
// API ROUTE NOT FOUND
// ==========================================

app.use(
  (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message:
        `API route not found: ${req.path}`,
    });
  }
);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(
  (
    error: Error & {
      status?: number;
      statusCode?: number;
      type?: string;
    },
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error(
      "Server error:",
      error
    );

    if (
      error instanceof SyntaxError &&
      "body" in error
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid JSON request body.",
      });
      return;
    }

    if (
      error.type ===
      "entity.too.large"
    ) {
      res.status(413).json({
        success: false,
        message:
          "Request body is too large.",
      });
      return;
    }

    if (
      error.type ===
      "entity.parse.failed"
    ) {
      res.status(400).json({
        success: false,
        message:
          "Invalid JSON request body.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message:
        "Internal server error.",
    });
  }
);

// ==========================================
// START EXPRESS SERVER
// ==========================================

const server = app.listen(
  PORT,
  () => {
    console.log(
      "=================================="
    );

    console.log(
      "       DubaiBiz AI Backend       "
    );

    console.log(
      "=================================="
    );

    console.log(
      `Server: http://localhost:${PORT}`
    );

    console.log(
      `Frontend: ${CLIENT_URL}`
    );

    console.log(
      `Health: http://localhost:${PORT}/api/health`
    );

    console.log(
      "=================================="
    );

    console.log(
      "            API ROUTES           "
    );

    console.log(
      "=================================="
    );

    console.log(
      "POST /api/auth/register"
    );

    console.log(
      "POST /api/auth/login"
    );

    console.log(
      "POST /api/auth/verify-email"
    );

    console.log(
      "POST /api/auth/resend-otp"
    );

    console.log(
      "GET  /api/auth/me"
    );

    console.log(
      "GET/POST /api/customers"
    );

    console.log(
      "GET/POST /api/leads"
    );

    console.log(
      "POST /api/ai/classify-lead"
    );

    console.log(
      "POST /api/assistant/chat"
    );

    console.log(
      "=================================="
    );

    console.log(
      "         ADMIN API ROUTES        "
    );

    console.log(
      "=================================="
    );

    console.log(
      "GET /api/admin/stats"
    );

    console.log(
      "GET /api/admin/users"
    );

    console.log(
      "=================================="
    );

    console.log(
      "          Backend Ready          "
    );

    console.log(
      "=================================="
    );
  }
);

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

let isShuttingDown = false;

function shutdown(
  signal: string
): void {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log(
    `${signal} received. Shutting down...`
  );

  server.close(
    (error?: Error) => {
      if (error) {
        console.error(
          "Server shutdown error:",
          error
        );

        process.exitCode = 1;
        return;
      }

      console.log(
        "HTTP server closed successfully."
      );
    }
  );
}

process.on(
  "SIGTERM",
  () => shutdown("SIGTERM")
);

process.on(
  "SIGINT",
  () => shutdown("SIGINT")
);
