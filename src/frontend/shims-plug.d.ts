import type { SessionData, PublicKey } from './types/plug'
import { ActorSubclass } from '@dfinity/agent'
import type { IDL } from '@dfinity/candid'
import { _SERVICE } from '@/../declarations/lockers_backend/lockers_backend.did'

declare global {
  interface Window {
    ic: {
      plug: {
        isConnected: () => Promise<boolean>
        disconnect: () => Promise<void>
        requestConnect: (props: {
          host?: string
          onConnectionUpdate?: () => void
          whitelist?: string[]
          timeout?: number
        }) => Promise<PublicKey>
        createActor: (props: {
          canisterId: string
          interfaceFactory: IDL.InterfaceFactory
        }) => Promise<ActorSubclass<_SERVICE>>
        sessionManager: {
          sessionData: SessionData
        }
      } & SessionData
    }
  }
}
