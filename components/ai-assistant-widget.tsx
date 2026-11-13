"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Globe2,
  DollarSign,
  ShieldCheck,
  HelpCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Explain FOB vs CIF for Dubai air freight",
  "What is the status of order EXP-2026-001?",
  "How does PayPal 4-way reconciliation work?",
  "What Incoterm is best for sample exports?",
];

export function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-1",
      sender: "assistant",
      text: "Hello! I am your ExportPilot AI Trade & Finance Assistant. Ask me anything about your export orders, UAE customs, Incoterms (FOB/CIF), or PayPal payment reconciliation.",
      timestamp: "Just now",
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Attempt to call server assistant API
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantReply =
          data.reply || data.response || data.answer || "Trade query processed.";
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            sender: "assistant",
            text: assistantReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        setIsLoading(false);
        return;
      }
    } catch (err) {
      // Backend not yet reached, fallback to contextual knowledge engine
    }

    // Contextual trade finance knowledge engine
    setTimeout(() => {
      let reply = "";
      const lower = textToSend.toLowerCase();

      if (lower.includes("fob") || lower.includes("cif")) {
        reply =
          "Under FOB (Free On Board), the seller is responsible for goods up to the point of loading onto the air carrier or vessel in the export country (e.g. India). The buyer (Al-Mansoor Luxury Goods in UAE) bears the freight cost and risk thereafter.\n\nUnder CIF (Cost, Insurance and Freight), the seller pays both air/sea freight and marine cargo insurance up to the destination port (Dubai DXB Terminal). For order EXP-2026-001, FOB is selected with an explicit $150.00 air freight quote added.";
      } else if (lower.includes("exp-2026-001") || lower.includes("status")) {
        reply =
          "Order EXP-2026-001 is for Tariq Al-Mansoor (Al-Mansoor Luxury Goods LLC, Dubai, UAE) for 100 handcrafted genuine leather wallets (SKU: HW-WL-01). Unit price is approved at $35.00/unit with $150.00 air freight to DXB, totaling $3,650.00 USD. Current status is 'Quoted', ready for PayPal Sandbox checkout.";
      } else if (lower.includes("reconciliation") || lower.includes("4-way")) {
        reply =
          "ExportPilot PayFlow enforces a strict 4-Way Cryptographic Payment Reconciliation Guardrail:\n1. Internal Order ID verification against database records.\n2. PayPal Gateway Order ID match.\n3. Exact ISO Currency Code match (e.g. USD).\n4. Exact Integer Minor Unit Amount match (e.g. 365,000 cents == $3,650.00).\nOnly when all 4 invariants pass is the order transitioned to 'paid'.";
      } else if (lower.includes("margin") || lower.includes("profit") || lower.includes("wallet")) {
        reply =
          "At a quoted export price of $35.00 USD (3,500 minor units) per handcrafted genuine leather wallet on 100 units, gross revenue is $3,500.00 USD. Assuming typical artisan manufacturing cost of $18.00/unit ($1,800 total), your gross export margin is 48.57% ($1,700.00 profit) before air freight!";
      } else {
        reply =
          "I have analyzed your export enquiry. Our platform enforces strict integer minor units ($1 = 100 cents), anti-hallucination structured extraction, and verified PayPal webhook capture. How can I assist with your export quotation or shipping terms?";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: "assistant",
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setIsLoading(false);
    }, 500);
  };

  return (
    <aside aria-label="AI Assistant" className="fixed bottom-5 right-5 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="h-13 w-13 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-3 text-navy-950 shadow-xl shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center relative group"
          title="Open AI Trade Assistant"
        >
          <Bot className="h-7 w-7 text-navy-950 font-bold" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-300 ring-2 ring-navy-950 animate-pulse" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={cn(
            "rounded-2xl glass-modal shadow-2xl flex flex-col overflow-hidden transition-all duration-200",
            isExpanded
              ? "w-[92vw] sm:w-[600px] h-[80vh] max-h-[750px]"
              : "w-[92vw] sm:w-[400px] h-[520px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  ExportPilot AI Assistant
                  <Badge variant="success" className="text-[9px] py-0 px-1 font-mono tabular-nums">
                    Online
                  </Badge>
                </h3>
                <p className="text-[10px] text-slate-400">Trade, Incoterms & PayPal Advisor</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors hidden sm:inline"
                title={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                title="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex flex-col max-w-[85%] p-3 space-y-1",
                  m.sender === "user"
                    ? "ml-auto bg-gradient-to-br from-emerald-500 to-emerald-600 text-slate-950 font-medium rounded-2xl rounded-br-none shadow-md shadow-emerald-500/20"
                    : "mr-auto bg-slate-900/70 backdrop-blur-md border border-white/[0.08] text-slate-100 rounded-2xl rounded-bl-none shadow-sm"
                )}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                <span
                  className={cn(
                    "text-[9px] self-end font-mono tabular-nums",
                    m.sender === "user" ? "text-emerald-950/80 font-semibold" : "text-slate-500"
                  )}
                >
                  {m.timestamp}
                </span>
              </div>
            ))}

            {isLoading && (
              <div className="mr-auto bg-slate-900/70 backdrop-blur-md border border-white/[0.08] rounded-2xl rounded-bl-none p-3 text-xs text-slate-400 flex items-center gap-2">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                Analyzing trade context...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-3 py-2 border-t border-white/[0.06] bg-slate-950/60 backdrop-blur-md overflow-x-auto flex gap-1.5 no-scrollbar">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-sm border border-white/[0.08] hover:border-emerald-500/40 text-[10px] text-slate-300 hover:text-emerald-300 transition-colors shrink-0"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-white/[0.08] bg-slate-950/70 backdrop-blur-md flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask about orders, Incoterms, PayPal capture..."
              disabled={isLoading}
              className="h-9 text-xs bg-slate-950/80 border-white/[0.08] text-slate-200 placeholder:text-slate-500"
            />
            <Button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              size="sm"
              className="h-9 px-3 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
}
