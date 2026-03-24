"use client";

import { cn } from "@/lib/utils";
import type { DynamicToolUIPart, ToolUIPart, UITools } from "ai";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  CircleIcon,
  ClockIcon,
  WrenchIcon,
  XCircleIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { isValidElement, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AnyToolPart = ToolUIPart<UITools> | DynamicToolUIPart;

type ToolState = AnyToolPart["state"];

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS: Record<
  ToolState,
  { label: string; icon: ReactNode; color: string }
> = {
  "input-streaming": {
    label: "Pendiente",
    icon: <CircleIcon className="size-3" />,
    color: "text-muted-foreground",
  },
  "input-available": {
    label: "Ejecutando",
    icon: <ClockIcon className="size-3 animate-pulse" />,
    color: "text-yellow-600 dark:text-yellow-400",
  },
  "approval-requested": {
    label: "Esperando aprobación",
    icon: <ClockIcon className="size-3" />,
    color: "text-yellow-600 dark:text-yellow-400",
  },
  "approval-responded": {
    label: "Respondido",
    icon: <CheckCircleIcon className="size-3" />,
    color: "text-blue-600 dark:text-blue-400",
  },
  "output-available": {
    label: "Completado",
    icon: <CheckCircleIcon className="size-3" />,
    color: "text-green-600 dark:text-green-400",
  },
  "output-error": {
    label: "Error",
    icon: <XCircleIcon className="size-3" />,
    color: "text-red-600 dark:text-red-400",
  },
  "output-denied": {
    label: "Denegado",
    icon: <XCircleIcon className="size-3" />,
    color: "text-orange-600 dark:text-orange-400",
  },
};

function StatusBadge({ state }: { state: ToolState }) {
  const s = STATUS[state] ?? STATUS["input-streaming"];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        s.color
      )}
    >
      {s.icon}
      {s.label}
    </span>
  );
}

// ── JSON pre block ────────────────────────────────────────────────────────────

function JsonBlock({ value }: { value: unknown }) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-words">
      {text}
    </pre>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToolName(part: AnyToolPart): string {
  if (part.type === "dynamic-tool") return part.toolName;
  // type is "tool-{name}", strip the prefix
  return part.type.replace(/^tool-/, "");
}

// ── Tool component ────────────────────────────────────────────────────────────

export type ToolProps = {
  part: AnyToolPart;
  className?: string;
};

export function Tool({ part, className }: ToolProps) {
  const [open, setOpen] = useState(false);

  const toolName = getToolName(part);
  const isDone =
    part.state === "output-available" || part.state === "output-error";

  return (
    <div
      className={cn(
        "not-prose mb-3 w-full overflow-hidden rounded-md border border-border bg-card",
        className
      )}
    >
      {/* Header / trigger */}
      <button
        type="button"
        onClick={() => isDone && setOpen((v) => !v)}
        className={cn(
          "group flex w-full items-center justify-between gap-4 px-3 py-2.5 text-left transition-colors",
          isDone && "hover:bg-muted/40 cursor-pointer"
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          <WrenchIcon className="size-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium truncate">{toolName}</span>
          <StatusBadge state={part.state} />
        </div>
        {isDone && (
          <ChevronDownIcon
            className={cn(
              "size-4 text-muted-foreground transition-transform duration-200 shrink-0",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Collapsible body */}
      {open && isDone && (
        <div className="border-t border-border">
          {/* Input args */}
          {part.input != null && (
            <div className="space-y-1.5 p-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Parámetros
              </h4>
              <JsonBlock value={part.input} />
            </div>
          )}

          {/* Output */}
          {part.state === "output-available" && (
            <div className="space-y-1.5 border-t border-border p-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Resultado
              </h4>
              {isValidElement(part.output) ? (
                <>{part.output}</>
              ) : (
                <JsonBlock value={part.output} />
              )}
            </div>
          )}

          {/* Error */}
          {part.state === "output-error" && "errorText" in part && (
            <div className="space-y-1.5 border-t border-border p-3">
              <h4 className="text-xs font-medium uppercase tracking-wide text-destructive">
                Error
              </h4>
              <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {part.errorText}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
