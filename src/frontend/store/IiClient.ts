import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { AuthClient } from '@dfinity/auth-client'
import { ActorSubclass, HttpAgent } from '@dfinity/agent'
import { createActor } from '@/../declarations/lockers_backend'
import { _SERVICE } from '@/../declarations/lockers_backend/lockers_backend.did'
import router from '@/router'

// Refer to documentation: https://agent-js.icp.xyz/
export const useIiClientStore = defineStore('iiClientStore', () => {
  let authClient: AuthClient | undefined // can't be stored in ref...
  const authenticated = ref(false)
  const actor = ref<ActorSubclass<_SERVICE>>()
  const principalId = ref<string>()

  watch(
    () => authenticated.value,
    async (success) => {
      if (success) {
        const identity = authClient!.getIdentity()
        principalId.value = identity.getPrincipal().toString()
        const agent = new HttpAgent({ identity })
        actor.value = createActor(import.meta.env.VITE_APP_LOCKERS_BACKEND_CANISTER_ID, { agent })
      }
    }
  )

  async function init(): Promise<void> {
    if (authClient === undefined) {
      authClient = await AuthClient.create({
        keyType: 'Ed25519',
        idleOptions: {
          // call logout & reload window if idle for <idleTimeout> milliseconds
          idleTimeout: 10 * 60 * 1000, // 10 minutes
          onIdle: _cleanup
        }
      })
    }
    authenticated.value = await authClient.isAuthenticated()
  }

  async function login(): Promise<void> {
    await init()
    if (authenticated.value) {
      return
    }
    authenticated.value = await new Promise((resolve, reject) => {
      authClient?.login({
        identityProvider: import.meta.env.VITE_APP_II_URL,
        maxTimeToLive: BigInt(1 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 1 day in nanoseconds
        onSuccess: () => {
          resolve(true)
        },
        onError: (error) => {
          localStorage.removeItem('role')
          reject(error)
        },
        derivationOrigin: import.meta.env.VITE_APP_II_DERIVATION
      })
    })
  }

  async function logout(): Promise<void> {
    try {
      await authClient?.logout()
    } catch (error) {
      console.error(error)
    } finally {
      await _cleanup()
    }
  }

  async function _cleanup() {
    authClient = undefined
    authenticated.value = false
    actor.value = undefined
    principalId.value = undefined
    await router.push('login')
  }

  return {
    authenticated,
    principalId,
    actor,
    init,
    login,
    logout
  }
})
