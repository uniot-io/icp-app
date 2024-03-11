<template>
  <el-card
    class="full-width full-height locker-device-view-card"
    v-loading="loading"
    element-loading-text="Loading device data..."
    shadow="never"
  >
    <template #header>
      <el-row :gutter="20" class="mb-5">
        <el-col :span="6">
          <span>Name:&nbsp;</span>
          <span>{{ lockerData?.name }}</span>
        </el-col>
        <el-col :span="6">
          <span>Device Status:&nbsp;</span>
          <el-tag v-if="statusOnline" type="success">Online</el-tag>
          <el-tag v-else type="danger">Offline</el-tag>
        </el-col>
        <el-col :span="6">
          <span>Last Seen:&nbsp;</span>
          <el-tag type="info">{{ statusTimestamp }}</el-tag>
        </el-col>
      </el-row>
      <el-row >
        <el-text size="large">
          Closed by:
          <b>{{ lockerData?.owner }}</b>
        </el-text>
      </el-row>
      <el-row>
        <el-col :span="3">
          <el-button class="my-4 px-6 py-4" v-if="!stateOpen" @click="openLocker" type="success">Open</el-button>
        </el-col>
      </el-row>
    </template>
    <template v-if="!loading">
      <el-main class="un-locker">
        <el-image v-if="stateOpen" class="un-locker-icon" :src="LockerOpen" />
        <el-image v-else class="un-locker-icon mt-4" :src="LockerClose" />
      </el-main>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted, computed, watch } from 'vue'
import { IPublishPacket } from 'mqtt-packet'
// import { useIcpClientStore } from '@/store/IcpClient'
import { useMqttStore } from '@/store/MqttStore'
import { useUniotStore } from '@/store/UniotStore'
import { defaultDomain, deviceStatusTopic } from '@/utils/mqttTopics'
import { decodeIntoJSON, decodeIntoString } from '@/utils/msgDecoder'
import { UniotDevice } from '@/types/uniot'
import { MqttMessageDeviceStatus } from '@/types/mqtt'
import LockerOpen from '@/assets/locker-open.svg'
import LockerClose from '@/assets/locker-close.svg'
import { OracleLockerDto, useIcpClientStore } from '@/store/IcpClient'

interface UniotLockerDeviceViewProps {
  lockerId: bigint
}

type LockerEmits = {
  (e: 'opened', item: { lockerId: bigint }): void
}

const props = defineProps<UniotLockerDeviceViewProps>()
const emit = defineEmits<LockerEmits>()

const icpClient = useIcpClientStore()
const mqttClient = useMqttStore()
const uniotClient = useUniotStore()
const loading = ref(false)

const statusParsed = ref('')
const statusOnline = ref(false)
const stateOpen = ref(false)
const statusTimestamp = ref(Date.now().toLocaleString())

const lockerData = ref<OracleLockerDto>()

const statusTopic = ref('')

watch(
  () => ({
    lockerId: props.lockerId,
  }),
  async () => {
    await unsubscribeDeviceTopics()
    await setLockerData()
    await subscribeDeviceTopics()
  },
  { immediate: true }
)

onMounted(async () => {
  loading.value = true
  // workaround: wait while all topics will be unsubscribed
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
  await setLockerData()
  console.log('lockerData:', lockerData.value)
  await subscribeDeviceTopics()
  loading.value = false
})

onUnmounted(async () => {
  await unsubscribeDeviceTopics()
})

async function setLockerData() {
  const currentReceiver = await icpClient.currentReceiver()
  if (currentReceiver.lockers?.length) {
    const found = currentReceiver.lockers.find((locker) => locker.id === props.lockerId)
    if (found) {
      lockerData.value = found as OracleLockerDto
      statusTopic.value = lockerData.value.topicStatus
      stateOpen.value = !lockerData.value.locked
    }
  }
}

async function subscribeDeviceTopics() {
  try {
    await mqttClient.subscribe(statusTopic.value, onStatusMessage)
  } catch (error) {
    console.error(`failed to subscribe to topic: ${error}`)
  }
}

async function unsubscribeDeviceTopics() {
  try {
    await mqttClient.unsubscribe(statusTopic.value)
  } catch (error) {
    console.error(`failed to unsubscribe from topic: ${error}`)
  }
}

function onStatusMessage(topic: string, message: Buffer, packet: IPublishPacket) {
  console.log('onStatusMessage:', topic)
  if (packet.retain) {
    const status = decodeIntoJSON<MqttMessageDeviceStatus>(message, 'CBOR')
    statusParsed.value = decodeIntoString(message, 'CBOR')
    statusOnline.value = Boolean(status.online)
    statusTimestamp.value = new Date(status.timestamp * 1_000).toLocaleString()
  }
}

async function openLocker() {
  loading.value = true
  try {
    const result = await icpClient.actor?.openLocker(props.lockerId)
    emit('opened', { lockerId: props.lockerId })
    stateOpen.value = result || false
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}
</script>

<style lang="scss" scoped>
.el-card.locker-device-view-card {
  border: none;

  .el-card__body {
    padding-left: 0;
  }
}

.un-locker {
  display: flex;
  justify-content: center;
  align-items: center;

  .un-locker-icon {
    max-width: 500px;
  }
}
</style>
