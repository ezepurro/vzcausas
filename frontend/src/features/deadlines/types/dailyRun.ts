/** Lo que devuelve la corrida diaria. Viene sin el sobre `{ data }`. */
export interface DailyRunResult {
    mailboxSent: boolean
    mailboxNoticeCount: number
    lawyerSends: { lawyerId: number; sent: boolean; noticeCount: number }[]
}
