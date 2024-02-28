import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import router from '@/router'
import { LockerDto, UserDto } from '@/../declarations/lockers_backend/lockers_backend.did'
import { UserRole, AuthProvider } from '@/types/user'

import { usePlugClientStore } from './PlugClient'
import { useIiClientStore } from './IiClient'

export const useIcpClientStore = defineStore('icpClientStore', () => {
  const plugClient = usePlugClientStore()
  const iiClient = useIiClientStore()
  const authProvider = ref<AuthProvider>()
  const user = ref<UserDto>()
  const lockers = ref<LockerDto[]>([])
  const userRole = ref<UserRole | undefined>()
  const isAuthenticated = computed(() => auth.value?.authenticated)
  const actor = computed(() => auth.value?.actor)
  const auth = ref<typeof iiClient | typeof plugClient>()
  const principal = computed(() => {
    return {
      full: auth.value?.principalId || '',
      trimmed: auth.value?.principalId ? _trimmedPrincipal(auth.value.principalId) : ''
    }
  })

  watch(
    () => {},
    async () => {
      await _init().catch((error) => {
        console.error(error)
        throw error
      })
    },
    { immediate: true }
  )

  async function _init(): Promise<void> {
    authProvider.value = localStorage.getItem('authProvider') as AuthProvider
    userRole.value = localStorage.getItem('userRole') as UserRole
    if (!authProvider.value || !userRole.value) {
      return
    }
    if (authProvider.value === 'ii') {
      auth.value = iiClient as typeof iiClient
    }
    if (authProvider.value === 'plug') {
      auth.value = plugClient as typeof plugClient
    }
    await auth.value!.init()
  }

  async function login(role: UserRole, provider: AuthProvider): Promise<void> {
    localStorage.setItem('userRole', role)
    localStorage.setItem('authProvider', provider)
    await _init()
    if (isAuthenticated.value) {
      return
    }
    await auth.value!.login().catch((error) => {
      console.error(error)
      throw error
    })
  }

  async function logout(): Promise<void> {
    try {
      await auth.value?.logout()
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

  async function _cleanup() {
    localStorage.removeItem('userRole')
    localStorage.removeItem('authProvider')
    authProvider.value = undefined
    auth.value = undefined
    user.value = undefined
    userRole.value = undefined
    lockers.value = []
    await router.push('login')
  }

  function _trimmedPrincipal(principalId: string) {
    const principal = principalId.split('-')
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
