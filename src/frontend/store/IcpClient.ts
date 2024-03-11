import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import router from '@/router'
import { OracleDto, UserDto } from '@/../external_declarations/oracles_backend/oracles_backend.did'
import { LockerDto, ReceiverDto } from '@/../declarations/lockers_backend/lockers_backend.did'
import { UserRole, AuthProvider } from '@/types/user'

import { usePlugClientStore } from './PlugClient'
import { useIiClientStore } from './IiClient'

export type OracleLockerDto = OracleDto & LockerDto

export const useIcpClientStore = defineStore('icpClientStore', () => {
  const plugClient = usePlugClientStore()
  const iiClient = useIiClientStore()
  const authProvider = ref<AuthProvider>()
  const user = ref<UserDto>()
  const receiver = ref<ReceiverDto>()
  const lockers = ref<OracleLockerDto[]>([])
  const userRole = ref<UserRole | undefined>()
  const isAuthenticated = computed(() => auth.value?.authenticated)
  const actor = computed(() => auth.value?.actor)
  const oraclesActor = computed(() => auth.value?.oraclesActor)
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

  async function currentReceiver() {
    await _getReceiver()
    await _getReceiverLockers()
    return {
      receiver: receiver.value,
      lockers: lockers.value
    }
  }

  async function _getReceiver() {
    receiver.value = await actor.value?.getMyReceiver()
  }

  async function _getReceiverLockers() {
    lockers.value = []
    if (receiver.value?.lockers?.length) {
      for (const lockerId of receiver.value?.lockers) {
        const oracle = await oraclesActor.value?.getOracle(lockerId)
        const locker = await actor.value?.getLocker(lockerId)

        if (oracle?.length && locker?.length) {
          const oracleData = oracle[0] as OracleDto
          const lockerData = locker[0] as LockerDto
          lockers.value.push({ ...oracleData, ...lockerData })
        }
      }
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
      user.value = await oraclesActor.value?.getMyUser()
      console.log('USER:', user.value)
    } catch (err) {
      console.error('USER ERROR:', err)
      throw err
    }
  }

  async function _getLockers() {
    lockers.value = []
    if (user.value?.oracles?.length) {
      for (const oracleId of user.value?.oracles) {
        const oracle = await oraclesActor.value?.getOracle(oracleId)
        const locker = await actor.value?.getLocker(oracleId)

        if (oracle?.length && locker?.length) {
          const oracleData = oracle[0] as OracleDto
          const lockerData = locker[0] as LockerDto
          lockers.value.push({ ...oracleData, ...lockerData })
        }
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
    currentReceiver,
    login,
    logout
  }
})
