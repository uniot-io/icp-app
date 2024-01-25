<template>
  <el-container class="full-height un-main-inner" v-loading="loading" element-loading-text="Loading lockers...">
    <lockers-menu
      class="un-inner-left pt-3"
      v-if="existingLockers.size || suggestedLockers.length"
      :with-create-item="false"
      :default-selected-id="currentLockerId"
      :lockers="Array.from(existingLockers.values())"
      :suggested="suggestedLockers"
      @select="onSelectLocker"
    />
    <template v-if="lockersLoaded && devicesLoaded">
      <locker-view
        v-if="isCurrentLockerExisted"
        class="un-inner-right"
        :device-id="currentDeviceId"
        :device="currentDevice!"
        :create-locker="false"
      />
      <locker-view
        class="un-inner-right"
        v-else-if="suggestedLockers.length"
        :device-id="currentLockerId"
        :device="currentDevice!"
        :create-locker="true"
        @created="onLockerCreated"
      />
    </template>
    <el-main class="un-empty-inner" v-if="!(existingLockers.size || suggestedLockers.length)">
      <el-empty description="Unfortunately, we were unable to obtain a list of your Uniot devices.">
        <el-text>
          Please make sure you are authorized on the Uniot Platform with your
          <br />
          Internet Identity and have at least one active device.
        </el-text>
      </el-empty>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { IPublishPacket } from 'mqtt-packet'
import { useIcpClientStore } from '@/store/IcpClient'
import { useMqttStore } from '@/store/MqttStore'
import { useUniotStore } from '@/store/UniotStore'
import { deviceStatusTopic, defaultDomain, parseDeviceTopic } from '@/utils/mqttTopics'
import { decodeIntoJSON } from '@/utils/msgDecoder'
import LockerView from '@/views/locker/AdminLockerView.vue'
import LockersMenu, { LockerMenuItem } from '@/components/locker/AdminLockersMenu.vue'
import type { UniotDevice, UniotDeviceData } from '@/types/uniot'

const ZERO_LOCKER_ID = -1n
const icpClient = useIcpClientStore()
const mqttClient = useMqttStore()
const uniotClient = useUniotStore()

const loading = ref(false)
const lockersLoaded = ref(false)
const devicesLoaded = ref(false)

const uniotDevices = ref<Map<bigint, UniotDevice>>(new Map())
const deviceStatusWildTopic = computed(() => deviceStatusTopic(defaultDomain, uniotClient.userId, '+'))

const currentLockerId = ref(ZERO_LOCKER_ID)
const existingLockers = ref<Map<bigint, LockerMenuItem>>(new Map())
const suggestedLockers = computed((): LockerMenuItem[] => {
  return Array.from(uniotDevices.value.values(), (device) => ({
    id: calcDeviceId(device.name),
    name: device.name
  })).filter(({ name }) => !Array.from(existingLockers.value.values()).some((locker) => locker.name === name))
})

const currentDevice = computed(() =>
  uniotDevices.value.get(isCurrentLockerExisted.value ? currentDeviceId.value : currentLockerId.value)
)
const currentDeviceId = computed(() => {
  if (!uniotDevices.value.size) {
    return ZERO_LOCKER_ID
  }
  const deviceName = existingLockers.value.get(currentLockerId.value)?.name
  return deviceName ? calcDeviceId(deviceName) : ZERO_LOCKER_ID
})

const isCurrentLockerExisted = computed(() => {
  return existingLockers.value.has(currentLockerId.value)
})

onMounted(async () => {
  loading.value = true
  await loadUserLockers()
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
  await subscribeDeviceTopic()
  loading.value = false
})

onUnmounted(async () => {
  await mqttClient.unsubscribe(deviceStatusWildTopic.value)
})

async function loadUserLockers() {
  const currentUser = await icpClient.currentUser()
  if (currentUser.lockers?.length) {
    const lockers = currentUser.lockers.map(({ id, name, template }) => ({ id, name, template }))
    existingLockers.value = new Map(lockers.map((locker) => [locker.id, locker]))
    if (currentLockerId.value === ZERO_LOCKER_ID && existingLockers.value.size) {
      currentLockerId.value = existingLockers.value.keys().next().value
    }
  }
  lockersLoaded.value = true
}

async function subscribeDeviceTopic() {
  try {
    await mqttClient.subscribe(deviceStatusWildTopic.value, onDeviceMessage)
  } catch (error) {
    console.error(`failed to subscribe to topic: ${error}`)
  }
}

function onDeviceMessage(topic: string, message: Buffer, packet: IPublishPacket) {
  if (packet.retain) {
    const { deviceId } = parseDeviceTopic(topic)
    const intDeviceId = calcDeviceId(deviceId)
    const messageDecoded = decodeIntoJSON<UniotDeviceData>(message, 'CBOR')
    uniotDevices.value.set(intDeviceId, { name: deviceId, data: messageDecoded })
    if (currentLockerId.value === ZERO_LOCKER_ID) {
      currentLockerId.value = intDeviceId
    }
    devicesLoaded.value = true
  }
}

async function onLockerCreated({ lockerId, device }: { lockerId: bigint; device: UniotDevice }) {
  existingLockers.value.set(lockerId, {
    id: lockerId,
    name: device.name
  })
  currentLockerId.value = lockerId
}

async function onSelectLocker({ lockerId }: { lockerId: bigint }) {
  currentLockerId.value = lockerId
}

function calcDeviceId(deviceId: string): bigint {
  return BigInt(`0x${deviceId}`)
}
</script>
