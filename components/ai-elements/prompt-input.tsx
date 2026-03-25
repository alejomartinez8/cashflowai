"use client"

import { cn } from "@/lib/utils"
import type { ChatStatus } from "ai"
import { ArrowUpIcon, SquareIcon } from "lucide-react"
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ComponentProps,
  type FormEvent,
  type HTMLAttributes,
  type KeyboardEventHandler,
} from "react"

// ============================================================================
// Context
// ============================================================================

interface PromptInputContextValue {
  status: ChatStatus | undefined
  onStop: (() => void) | undefined
}

const PromptInputContext = createContext<PromptInputContextValue>({
  status: undefined,
  onStop: undefined,
})

// ============================================================================
// PromptInput — form wrapper
// ============================================================================

export type PromptInputProps = Omit<HTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  onSubmit: () => void
  status?: ChatStatus
  onStop?: () => void
}

export const PromptInput = ({
  className,
  onSubmit,
  status,
  onStop,
  children,
  ...props
}: PromptInputProps) => {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    onSubmit()
  }

  return (
    <PromptInputContext.Provider value={{ status, onStop }}>
      <form
        className={cn("space-y-2", className)}
        onSubmit={handleSubmit}
        {...props}
      >
        {children}
      </form>
    </PromptInputContext.Provider>
  )
}

// ============================================================================
// PromptInputBody — row container (textarea + submit side by side)
// ============================================================================

export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>

export const PromptInputBody = ({ className, ...props }: PromptInputBodyProps) => (
  <div
    className={cn(
      "flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-2.5",
      "transition-shadow focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.12)]",
      className
    )}
    style={{ boxShadow: "var(--shadow-md)" }}
    {...props}
  />
)

// ============================================================================
// PromptInputTextarea — auto-resizing textarea with keyboard shortcuts
// ============================================================================

export type PromptInputTextareaProps = ComponentProps<"textarea">

export const PromptInputTextarea = ({
  className,
  onKeyDown,
  placeholder = "¿En qué puedo ayudarte?",
  ...props
}: PromptInputTextareaProps) => {
  const ctx = useContext(PromptInputContext)
  const [isComposing, setIsComposing] = useState(false)

  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = useCallback(
    (e) => {
      onKeyDown?.(e)
      if (e.defaultPrevented) return

      if (e.key === "Enter") {
        if (isComposing || e.nativeEvent.isComposing) return
        if (e.shiftKey) return
        e.preventDefault()

        // Don't submit while the AI is generating
        const { status } = ctx
        if (status === "submitted" || status === "streaming") return

        // Respect the submit button's disabled state
        const submitButton = e.currentTarget.form?.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement | null
        if (submitButton?.disabled) return

        e.currentTarget.form?.requestSubmit()
      }
    },
    [onKeyDown, isComposing, ctx]
  )

  return (
    <textarea
      rows={1}
      className={cn(
        "flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground",
        "focus:outline-none leading-5 self-center overflow-y-auto",
        // field-sizing: content auto-grows the textarea based on content (no JS needed)
        "field-sizing-content max-h-40",
        className
      )}
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      onCompositionStart={() => setIsComposing(true)}
      onCompositionEnd={() => setIsComposing(false)}
      {...props}
    />
  )
}

// ============================================================================
// PromptInputSubmit — send / stop button (reads status from context)
// ============================================================================

export type PromptInputSubmitProps = ComponentProps<"button"> & {
  status?: ChatStatus
  onStop?: () => void
}

export const PromptInputSubmit = ({
  className,
  status: statusProp,
  onStop: onStopProp,
  disabled,
  ...props
}: PromptInputSubmitProps) => {
  const ctx = useContext(PromptInputContext)
  const status = statusProp ?? ctx.status
  const onStop = onStopProp ?? ctx.onStop
  const isGenerating = status === "submitted" || status === "streaming"

  if (isGenerating && onStop) {
    return (
      <button
        type="button"
        onClick={onStop}
        className={cn(
          "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs",
          "border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors",
          className
        )}
      >
        <SquareIcon className="size-2.5 fill-current" />
        Detener
      </button>
    )
  }

  return (
    <button
      type="submit"
      disabled={disabled}
      aria-label="Enviar"
      className={cn(
        "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-xl",
        "bg-primary text-primary-foreground disabled:opacity-30 hover:opacity-90 transition-all active:scale-95 shadow-sm",
        className
      )}
      {...props}
    >
      <ArrowUpIcon className="size-3.5" strokeWidth={2.5} />
    </button>
  )
}

// ============================================================================
// PromptInputFooter — metadata row below the input box
// ============================================================================

export type PromptInputFooterProps = HTMLAttributes<HTMLDivElement>

export const PromptInputFooter = ({ className, ...props }: PromptInputFooterProps) => (
  <div className={cn("flex justify-between items-center px-1", className)} {...props} />
)
