export const TOOL_NAMES = {
  GET_SHEET_DATA: 'get_sheet_data',
  GET_CURRENT_DATE: 'get_current_date',
  LIST_AVAILABLE_TABS: 'list_available_tabs',
} as const

export const STORAGE_KEYS = {
  MESSAGES: (userId: string) => `cashflowai_messages_${userId}`,
} as const
