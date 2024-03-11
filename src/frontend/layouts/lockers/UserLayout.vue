<template>
  <el-container class="full-height un-main-inner" v-loading="loading" element-loading-text="Loading lockers...">
    <lockers-menu
      class="un-inner-left"
      :with-create-item="false"
      :default-selected-id="currentLockerId"
      :lockers="Array.from(existingLockers.values())"
      :history="Array.from(historyLockers.values())"
      @select="onSelectLocker"
      style="padding-top: 10px"
    />
    <locker-view
      v-if="lockersLoaded && (existingLockers.size || historyLockers.size)"
      class="un-inner-right"
      :locker-id="currentLockerId"
      :create-locker="false"
      @opened="onLockerOpened"
    />
    <el-main
      class="un-empty-inner is-flex justify-center items-center"
      v-if="!(existingLockers.size || historyLockers.size)"
    >
      <el-empty description="You don't have assigned locker yet" />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIcpClientStore } from '@/store/IcpClient'
import { useMqttStore } from '@/store/MqttStore'
import { useUniotStore } from '@/store/UniotStore'
import { deviceStatusTopic, defaultDomain } from '@/utils/mqttTopics'
import LockerView from '@/views/locker/UserLockerView.vue'
import LockersMenu, { LockerMenuItem } from '@/components/locker/UserLockersMenu.vue'
import type { UniotDevice } from '@/types/uniot'

const ZERO_LOCKER_ID = -1n
const icpClient = useIcpClientStore()
const mqttClient = useMqttStore()
const uniotClient = useUniotStore()

const loading = ref(false)
const lockersLoaded = ref(false)
// const devicesLoaded = ref(false)

// const uniotDevices = ref<Map<bigint, UniotDevice>>(new Map())
// const deviceStatusWildTopic = computed(() => deviceStatusTopic(defaultDomain, uniotClient.userId, '+'))

const currentLockerId = ref(ZERO_LOCKER_ID)
const existingLockers = ref<Map<bigint, LockerMenuItem>>(new Map())
const historyLockers = ref<Map<bigint, LockerMenuItem>>(new Map())

// const currentDevice = computed(() =>
//   uniotDevices.value.get(isCurrentLockerExisted.value ? currentDeviceId.value : currentLockerId.value)
// )
// const currentDeviceId = computed(() => {
//   if (!uniotDevices.value.size) {
//     return ZERO_LOCKER_ID
//   }
//   const deviceName = existingLockers.value.get(currentLockerId.value)?.name
//   return deviceName ? calcDeviceId(deviceName) : ZERO_LOCKER_ID
// })

// const isCurrentLockerExisted = computed(() => {
//   return existingLockers.value.has(currentLockerId.value)
// })

const currentLocker = computed(() => {
  return existingLockers.value.get(currentLockerId.value)
})

onMounted(async () => {
  loading.value = true
  await loadUserLockers()
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
  // await subscribeDeviceTopic()
  loading.value = false
})

onUnmounted(async () => {
  // await mqttClient.unsubscribe(deviceStatusWildTopic.value)
})

async function loadUserLockers() {
  const currentReceiver = await icpClient.currentReceiver()
  if (currentReceiver.lockers?.length) {
    const lockers = currentReceiver.lockers.map(({ id, name, template }) => ({ id, name, template }))
    existingLockers.value = new Map(lockers.map((locker) => [locker.id, locker]))
    if (currentLockerId.value === ZERO_LOCKER_ID && existingLockers.value.size) {
      currentLockerId.value = existingLockers.value.keys().next().value
    }
  }
  // if (currentUser.history?.length) {
  //   const lockers = currentUser.history.map(({ id, name, template }) => ({ id, name, template }))
  //   historyLockers.value = new Map(lockers.map((locker) => [locker.id, locker]))
  // }
  lockersLoaded.value = true
}

function onLockerOpened(item: { lockerId: bigint }) {
  historyLockers.value.set(item.lockerId, existingLockers.value.get(item.lockerId)!)
  existingLockers.value.delete(item.lockerId)
}

// async function subscribeDeviceTopic() {
//   try {
//     await mqttClient.subscribe(deviceStatusWildTopic.value, onDeviceMessage)
//   } catch (error) {
//     console.error(`failed to subscribe to topic: ${error}`)
//   }
// }

// function onDeviceMessage(topic: string, message: Buffer, packet: IPublishPacket) {
//   if (packet.retain) {
//     const { deviceId } = parseDeviceTopic(topic)
//     const intDeviceId = calcDeviceId(deviceId)
//     const messageDecoded = decodeIntoJSON<UniotDeviceData>(message, 'CBOR')
//     uniotDevices.value.set(intDeviceId, { name: deviceId, data: messageDecoded })
//     if (currentLockerId.value === ZERO_LOCKER_ID) {
//       currentLockerId.value = intDeviceId
//     }
//     devicesLoaded.value = true
//   }
// }

async function onSelectLocker({ lockerId }: { lockerId: bigint }) {
  currentLockerId.value = lockerId
}

// function calcDeviceId(deviceId: string): bigint {
//   return BigInt(`0x${deviceId}`)
// }
</script>
