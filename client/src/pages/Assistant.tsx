
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  Bot,
  Send,
  User,
  Sparkles,
  RefreshCw,
  AlertCircle,
  MessageSquare,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

// ==========================================
// API CONFIGURATION
// ==========================================

const ASSISTANT_API_URL =
  "http://localhost:5000/api/assistant/chat";

// ==========================================
// TYPES
// ==========================================

type MessageRole = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

interface AssistantResponse {
  success: boolean;
  message?: string;
  data?: {
    reply: string;
    intent?: string;
  };
}

// ==========================================
// SUGGESTED QUESTIONS
// ==========================================

const suggestedQuestions = [
  "How many customers do I have?",
  "How many leads do I have?",
  "Show my qualified leads",
  "How many high priority leads?",
  "What is my lead conversion rate?",
  "Summarize my CRM",
];

// ==========================================
// INITIAL MESSAGE
// ==========================================

function createWelcomeMessage(): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content:
      "Hello! I'm your DubaiBiz AI CRM Assistant. " +
      "I can help you understand your customers, leads, " +
      "priorities, and business performance. " +
      "Ask me a question or select one of the suggestions below.",
    createdAt: new Date(),
  };
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function Assistant() {
  const { token, logout } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([
    createWelcomeMessage(),
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // ==========================================
  // AUTO SCROLL
  // ==========================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  async function sendMessage(question?: string) {
    const text = (question ?? input).trim();

    if (!text || loading) return;

    if (!token) {
      setError("Please sign in to use the CRM Assistant.");
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      createdAt: new Date(),
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(ASSISTANT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      if (response.status === 401) {
        logout();
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const result =
        (await response.json()) as AssistantResponse;

      if (
        !response.ok ||
        !result.success ||
        !result.data?.reply
      ) {
        throw new Error(
          result.message ||
            "The assistant could not process your request."
        );
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.data.reply,
        createdAt: new Date(),
      };

      setMessages((previous) => [
        ...previous,
        assistantMessage,
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the assistant."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // FORM SUBMIT
  // ==========================================

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  // ==========================================
  // CLEAR CHAT
  // ==========================================

  function clearChat() {
    if (loading) return;

    setMessages([createWelcomeMessage()]);
    setInput("");
    setError("");
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="flex min-h-[calc(100vh-100px)] flex-col bg-gray-50 p-4 md:p-8">
      {/* PAGE HEADER */}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-3 text-purple-700">
              <Sparkles size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                AI Assistant
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Your CRM insights and business assistant
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={clearChat}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw size={16} />
          New Chat
        </button>
      </div>

      {/* MAIN CHAT PANEL */}

      <div className="flex min-h-[650px] flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* CHAT HEADER */}

        <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-6 py-4">
          <div className="rounded-full bg-purple-100 p-3 text-purple-700">
            <Bot size={22} />
          </div>

          <div>
            <h2 className="font-bold text-gray-900">
              DubaiBiz AI Assistant
            </h2>

            <p className="text-xs text-gray-500">
              Database-backed CRM query assistant
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Local Development
          </div>
        </div>

        {/* CHAT MESSAGES */}

        <div className="max-h-[520px] min-h-[350px] flex-1 space-y-6 overflow-y-auto bg-gray-50/50 p-5 md:p-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start gap-3 ${
                message.role === "user"
                  ? "flex-row-reverse"
                  : ""
              }`}
            >
              {/* AVATAR */}

              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  message.role === "assistant"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {message.role === "assistant" ? (
                  <Bot size={20} />
                ) : (
                  <User size={20} />
                )}
              </div>

              {/* MESSAGE BUBBLE */}

              <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm md:max-w-[75%] ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "border border-gray-200 bg-white text-gray-800"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-7">
                  {message.content}
                </p>

                <p
                  className={`mt-2 text-right text-[11px] ${
                    message.role === "user"
                      ? "text-blue-100"
                      : "text-gray-400"
                  }`}
                >
                  {message.createdAt.toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </div>
            </div>
          ))}

          {/* LOADING INDICATOR */}

          {loading && (
            <div
              role="status"
              className="flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                <Bot size={20} />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500">
                <span className="animate-pulse">
                  Analyzing your CRM data...
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ERROR MESSAGE */}

        {error && (
          <div
            role="alert"
            className="mx-5 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SUGGESTED QUESTIONS */}

        <div className="border-t border-gray-100 px-5 py-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-600">
            <MessageSquare size={16} />
            Suggested Questions
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() =>
                  void sendMessage(question)
                }
                disabled={loading}
                className="rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-xs font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* CHAT INPUT */}

        <form
          onSubmit={handleSubmit}
          className="border-t border-gray-200 bg-white p-4 md:p-5"
        >
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(event) =>
                setInput(event.target.value)
              }
              placeholder="Ask about customers, leads, priorities..."
              maxLength={500}
              disabled={loading}
              aria-label="Ask the CRM Assistant"
              className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-5 py-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={18} />
              <span className="hidden sm:inline">
                Send
              </span>
            </button>
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            Responses will use CRM data once the assistant backend
            is connected. This initial version is not an LLM chatbot.
          </p>
        </form>
      </div>
    </div>
  );
}
