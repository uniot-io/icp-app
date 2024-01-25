<template>
  <h1>{{ msg }}</h1>

  <button class="demo-button" @click="login()">Login</button>
  <p>
    {{ principal }}
  </p>
</template>

<script lang="ts">
import { ref, defineComponent } from 'vue'
import { createActor } from '@/../declarations/lockers_backend'
import { AuthClient } from '@dfinity/auth-client'
import { HttpAgent } from '@dfinity/agent'

export default defineComponent({
  name: 'HelloWorld',
  props: {
    msg: {
      type: String,
      required: true
    }
  },
  setup: () => {
    const principal = ref('')

    const login = async () => {
      // create an auth client
      const authClient = await AuthClient.create()

      // if (!authClient.isAuthenticated()) {
      // start the login process and wait for it to finish
      await new Promise((resolve) => {
        authClient.login({
          identityProvider: import.meta.env.VITE_APP_II_URL,
          onSuccess: () => {
            resolve(true)
          },
          derivationOrigin: import.meta.env.VITE_APP_II_DERIVATION
        })
      })
      // }

      // At this point we're authenticated, and we can get the identity from the auth client:
      const identity = authClient.getIdentity()
      // Using the identity obtained from the auth client, we can create an agent to interact with the IC.
      const agent = new HttpAgent({ identity })
      principal.value = (await agent.getPrincipal()).toString()
      // Using the interface description of our webapp, we create an actor that we use to call the service methods.
      const actor = createActor(import.meta.env.VITE_APP_LOCKERS_BACKEND_CANISTER_ID, {
        agent
      })

      const lockerId = await actor.createLocker('test', 'generic')
      console.log('lockerId:', lockerId)

      await actor.subscribe(lockerId, [
        { topic: 'hello', msgType: 'application/json' },
        { topic: 'world', msgType: 'text/plain' }
      ])
      console.log('subscribed')

      const lockerDto = await actor.getLocker(lockerId)
      console.log('lockerDto:', lockerDto)

      // await actor.publish('hello', new TextEncoder().encode('world'))
      // console.log('published')

      const subscription = await actor.getSubscription('hello')
      console.log('subscription:', subscription)

      const user = await actor.getUser(identity.getPrincipal())
      console.log('user:', user)

      const myUser = await actor.getMyUser()
      console.log('myUser:', myUser)

      for (const id of user[0]!.lockers) {
        const locker = await actor.getLocker(id)
        console.log('user locker:', locker)
      }
    }

    return { principal, login }
  }
})
</script>

<style scoped>
.demo-button {
  margin: 5px;
  background: linear-gradient(237.86deg, #532885 -20%, #ee1f7a 124%);
  padding: 0 2em;
  border-radius: 60px;
  font-size: 0.7em;
  line-height: 40px;
  outline: 0;
  border: 0;
  cursor: pointer;
  text-transform: uppercase;
  font-weight: 900;
  color: white;
}
</style>
