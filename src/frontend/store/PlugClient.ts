import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ActorSubclass } from '@dfinity/agent'

import { idlFactory } from '@/../declarations/lockers_backend'
import { _SERVICE } from '@/../declarations/lockers_backend/lockers_backend.did'

import type { PublicKey } from '@/types/plug'

export const usePlugClientStore = defineStore('plugClientStore', () => {
  const publicKey = ref<PublicKey>()
  const authenticated = ref(false)
  const actor = ref<ActorSubclass<_SERVICE>>()
  const principalId = ref<string>()
  const plug = computed(() => window.ic?.plug)

  async function _postLogin() {
    actor.value = await plug.value.createActor({
      canisterId: import.meta.env.VITE_APP_LOCKERS_BACKEND_CANISTER_ID,
      interfaceFactory: idlFactory
    })
    principalId.value = plug.value.principalId
    authenticated.value = true
  }

  async function init() {
    await _verifyPlug()
    if (actor.value === undefined && principalId.value === undefined) {
      const connected = await plug.value.isConnected()
      if (connected && plug.value.principalId) {
        await _postLogin()
      }
    }
  }

  async function login() {
    await _verifyPlug()
    await init()
    if (authenticated.value) {
      return
    }
    authenticated.value = await new Promise((resolve) => {
      plug.value
        .requestConnect({
          whitelist: [
            import.meta.env.VITE_APP_LOCKERS_BACKEND_CANISTER_ID,
            import.meta.env.VITE_APP_LOCKERS_FRONTEND_CANISTER_ID
          ],
          host: 'http://127.0.0.1:4943', // TODO: move to .env
          onConnectionUpdate: () => {
            // TODO: handle switching to another identity
            console.log(window.ic.plug.sessionManager.sessionData)
          }
        })
        .then((pubKey: PublicKey) => {
          publicKey.value = pubKey
          _postLogin().then(() => resolve(true))
        })
    })
  }

  async function logout(): Promise<void> {
    try {
      await plug.value.disconnect()
    } catch (error) {
      console.error(error)
    } finally {
      await _cleanup()
    }
  }

  async function _verifyPlug() {
    if (typeof window.ic?.plug !== 'object') {
      throw new Error('Plug Wallet is not installed')
    }
  }

  async function _cleanup() {
    publicKey.value = undefined
    actor.value = undefined
    principalId.value = undefined
    authenticated.value = false
  }

  return {
    principalId,
    authenticated,
    actor,
    init,
    login,
    logout
  }
})
