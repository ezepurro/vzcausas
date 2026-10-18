import {useCurrentUser} from '@/app/providers/AuthContext'
import { can, type Action } from '@/app/access/access'

//¿El usuario de la sesión puede hacer esta acción?
export function useCan(action: Action): boolean {
    return can(useCurrentUser().roles, action )
}