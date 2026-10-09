import { useQuery } from "@tanstack/react-query";
import { getCustomStates } from "./cases.api";
import type { Jurisdiction } from "@/features/legal-params";
import { casesKeys } from "./cases.keys";

export function useCaseCustomStates(jurisdiction?: Jurisdiction) {
    return useQuery(
        {
            queryKey: casesKeys.customStates(jurisdiction),
            queryFn: () => getCustomStates(jurisdiction),
        }
    )
}