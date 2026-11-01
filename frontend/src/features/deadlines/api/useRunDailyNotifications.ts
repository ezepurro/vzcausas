/** `POST /internal/deadlines/daily-run` */

import { useMutation } from '@tanstack/react-query'

import { runDailyNotifications } from '@/features/deadlines/api/deadlines.api'

export function useRunDailyNotifications() {
    return useMutation({
        mutationFn: runDailyNotifications,
    })
}
