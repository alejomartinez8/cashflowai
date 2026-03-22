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

const BotIcon = () => (
  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>
    </svg>
  </div>
)

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user'
  const text = extractText(message)

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[72%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm shadow-sm"
          style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
        >
          <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-3 items-start">
      <BotIcon />
      <div
        className="max-w-[78%] rounded-2xl rounded-tl-sm px-4 py-3 text-sm chat-prose border border-border"
        style={{
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    </div>
  )
}
