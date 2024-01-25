import { defineStore } from 'pinia'
import { computed, ref, watch, watchEffect } from 'vue'
import router from '@/router'
import { AuthClient } from '@dfinity/auth-client'
import { ActorSubclass, HttpAgent, Identity } from '@dfinity/agent'
import { createActor } from '@/../declarations/lockers_backend'
import { _SERVICE, LockerDto, UserDto } from '@/../declarations/lockers_backend/lockers_backend.did'
import { UserRole } from '@/types/user'

// Refer to documentation: https://agent-js.icp.xyz/
export const useIcpClientStore = defineStore('icpClientStore', () => {
  let authClient: AuthClient | undefined // can't be stored in ref...
  const authenticated = ref(false)
  const identity = ref<Identity>()
  const actor = ref<ActorSubclass<_SERVICE>>()
  const user = ref<UserDto>()
  const lockers = ref<LockerDto[]>([])
  const userRole = ref<UserRole | undefined>()
  const isAuthenticated = computed(() => authenticated.value)
  const principal = computed(() => {
    return {
      full: identity.value?.getPrincipal().toString() || '',
      trimmed: identity.value ? _trimmedPrincipal(identity.value) : ''
    }
  })

  watch(
    () => authenticated.value,
    async (success) => {
      if (success) {
        identity.value = authClient!.getIdentity()
        const agent = new HttpAgent({ identity: identity.value })
        actor.value = createActor(import.meta.env.VITE_APP_LOCKERS_BACKEND_CANISTER_ID, { agent })
      }
    },
    { immediate: true }
  )

  watchEffect(async () => {
    await _init().catch((error) => {
      console.error(error)
      throw error
    })
  })

  async function login(role: UserRole): Promise<void> {
    await _init(role)
    if (authenticated.value) {
      return
    }
    authenticated.value = await new Promise((resolve, reject) => {
      authClient
        ?.login({
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
        .catch((error) => {
          console.error(error)
          throw error
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

  async function currentUser() {
    await _getUser()
    await _getLockers()
    return {
      user: user.value,
      lockers: lockers.value
    }
  }

  async function _getUser() {
    try {
      user.value = await actor.value?.getMyUser()
    } catch (err) {
      console.error('USER ERROR:', err)
      throw err
    }
  }

  async function _getLockers() {
    lockers.value = []
    for (const lockerId of user.value!.lockers) {
      const locker = await actor.value?.getLocker(lockerId)
      if (locker?.length) {
        lockers.value.push(locker[0])
      }
    }
  }

  async function _init(role?: UserRole): Promise<void> {
    if (role) {
      localStorage.setItem('role', role)
    } else {
      role = localStorage.getItem('role') as UserRole
    }
    if (!role) {
      await _cleanup()
      return
    }
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
    userRole.value = role as UserRole
  }

  async function _cleanup() {
    authClient = undefined
    identity.value = undefined
    user.value = undefined
    localStorage.removeItem('role')
    userRole.value = undefined
    lockers.value = []
    authenticated.value = false
    await router.push('login')
  }

  function _trimmedPrincipal(identity: Identity) {
    const principal = identity.getPrincipal().toString().split('-')
    return principal ? `${principal[0]}- ... -${principal[principal.length - 1]}` : ''
  }

  return {
    userRole,
    isAuthenticated,
    principal,
    actor,
    currentUser,
    login,
    logout
  }
})
