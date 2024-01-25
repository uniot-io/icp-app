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
          <span>Device Status:&nbsp;</span>
          <el-tag v-if="statusOnline" type="success">Online</el-tag>
          <el-tag v-else type="danger">Offline</el-tag>
        </el-col>
        <el-col :span="18">
          <span>Last Seen:&nbsp;</span>
          <el-tag type="info">{{ statusTimestamp }}</el-tag>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="3">
          <el-button class="px-6 py-4" v-if="stateOpen" @click="closeLocker" type="danger">Close</el-button>
          <el-button class="px-6 py-4" v-else @click="openLocker" type="success">Open</el-button>
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
import { ref, onUnmounted, onMounted, computed } from 'vue'
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

interface UniotLockerDeviceViewProps {
  deviceId: bigint
  device: UniotDevice | undefined
}

// type UniotDeviceEmits = {
//   (e: 'created', item: { lockerId: bigint; device: UniotDevice }): void
// }

const props = defineProps<UniotLockerDeviceViewProps>()
// const emit = defineEmits<UniotDeviceEmits>()

// const icpClient = useIcpClientStore()
const mqttClient = useMqttStore()
const uniotClient = useUniotStore()
const loading = ref(false)

const statusParsed = ref('')
const statusOnline = ref(false)
const stateOpen = ref(true)
const statusTimestamp = ref(Date.now().toLocaleString())

const statusTopic = computed(() => deviceStatusTopic(defaultDomain, uniotClient.userId, props.device!.name))
// const stateTopic = computed(() => deviceLockerTopic(defaultDomain, uniotClient.userId, props.device.name))

onMounted(async () => {
  loading.value = true
  // workaround: wait while all topics will be unsubscribed
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
  await subscribeDeviceTopics()
  loading.value = false
})

onUnmounted(async () => {
  await mqttClient.unsubscribe(statusTopic.value)
})

async function subscribeDeviceTopics() {
  try {
    await mqttClient.subscribe(statusTopic.value, onStatusMessage)
  } catch (error) {
    console.error(`failed to subscribe to topic: ${error}`)
  }

  // try {
  //   await mqttClient.subscribe(stateTopic.value, onStateMessage)
  // } catch (error) {
  //   console.error(`failed to subscribe to topic: ${error}`)
  // }
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

// function onStateMessage(topic: string, message: Buffer, packet: IPublishPacket) {
//   if (packet.retain) {
//     // const status = decodeIntoJSON<MqttMessageDeviceEvent>(message, 'CBOR')
//     // statusParsed.value = decodeIntoString(message, 'CBOR')
//     // statusOnline.value = Boolean(status.online)
//     // statusTimestamp.value = new Date(status.timestamp * 1_000).toLocaleString()
//   }
// }

async function closeLocker() {
  stateOpen.value = false
}

async function openLocker() {
  stateOpen.value = true
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
