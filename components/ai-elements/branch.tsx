"use client"

import { cn } from "@/lib/utils"
import { ChevronLeftIcon, ChevronRightIcon, RefreshCwIcon } from "lucide-react"
import type { HTMLAttributes } from "react"
import type { BranchStore } from "@/hooks/use-branch-store"

// ============================================================================
// BranchNav — navigation bar shown below the last assistant message
//
// Shows: [◀] N / M [▶]  |  Regenerar
// Only visible when totalBranches > 1 or as a regenerate affordance
// ============================================================================

export type BranchNavProps = HTMLAttributes<HTMLDivElement> & {
  branchStore: BranchStore
  isStreaming?: boolean
}

export const BranchNav = ({
  branchStore,
  isStreaming,
  className,
  ...props
}: BranchNavProps) => {
  const { currentIdx, totalBranches, navigateTo, regenerate } = branchStore
  const canNavigate = totalBranches > 1

  if (isStreaming) return null

  return (
    <div
      className={cn(
        "flex items-center gap-2 mt-1.5 ml-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      {/* Branch pagination */}
      {canNavigate && (
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => navigateTo(currentIdx > 0 ? currentIdx - 1 : totalBranches - 1)}
            aria-label="Respuesta anterior"
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>
          <span className="text-xs tabular-nums px-0.5">
            {currentIdx + 1} / {totalBranches}
          </span>
          <button
            type="button"
            onClick={() => navigateTo(currentIdx < totalBranches - 1 ? currentIdx + 1 : 0)}
            aria-label="Siguiente respuesta"
            className="flex items-center justify-center w-5 h-5 rounded hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      )}

      {/* Divider only when pagination is visible */}
      {canNavigate && (
        <span className="text-border text-xs select-none">·</span>
      )}

      {/* Regenerate button */}
      <button
        type="button"
        onClick={regenerate}
        aria-label="Regenerar respuesta"
        className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
      >
        <RefreshCwIcon className="size-3" />
        Regenerar
      </button>
    </div>
  )
}
