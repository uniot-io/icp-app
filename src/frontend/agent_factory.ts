import { createActor } from '@/../declarations/lockers_backend'

export const counterCanisterId = import.meta.env.VITE_APP_LOCKERS_BACKEND_CANISTER_ID

export const counterAgent = createActor(counterCanisterId?.toString() ?? 'no canister id provided for counter')

export { createActor }
