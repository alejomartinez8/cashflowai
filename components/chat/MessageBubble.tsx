import type { UIMessage } from 'ai'
import ReactMarkdown from 'react-markdown'

interface Props {
  message: UIMessage
}

function extractText(message: UIMessage): string {
  return message.parts
    .filter((p) => p.type === 'text')
    .map((p) => (p as { type: 'text'; text: string }).text)
    .join('')
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const text = extractText(message)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm bg-primary text-primary-foreground">
          <p className="whitespace-pre-wrap break-words">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-2.5">
      <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
        </svg>
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm bg-muted text-foreground prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  )
}
