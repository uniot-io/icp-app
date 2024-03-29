<template>
  <el-card
    class="full-width full-height locker-device-view-card"
    v-loading="loading"
    element-loading-text="Loading device data..."
    shadow="never"
  >
    <el-main v-if="createLocker" class="un-empty-inner">
      <el-empty description="Add your device to use it">
        <el-button type="primary" :icon="CirclePlus" @click="createLockerDevice">Add locker</el-button>
      </el-empty>
    </el-main>
    <template v-if="!createLocker" #header>
      <el-row :gutter="20" class="mb-5">
        <el-col :span="6">
          <span>Name:&nbsp;</span>
          <span>{{ device?.name }}</span>
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
      <el-form v-if="stateOpen" :inline="true" ref="formRef" :model="form">
        <el-form-item :rules="rules.receiver" :prop="'receiver'" class="mr-3 mb-0">
          <el-input style="width: 400px" v-model="form.receiver" placeholder="Principal ID">
            <template #prepend>Close for:</template>
          </el-input>
        </el-form-item>
        <el-form-item class="mb-0">
          <el-button @click="closeLocker(formRef)" type="danger">Close</el-button>
        </el-form-item>
      </el-form>
      <el-row v-else>
        <el-col :span="24">
          <el-text size="large">
            Closed for:
            <b>{{ form.receiver }}</b>
          </el-text>
        </el-col>
        <el-col class="mt-3">
          <el-button type="success" @click="openLocker()">Open</el-button>
        </el-col>
      </el-row>
    </template>
    <template v-if="!createLocker && !loading">
      <el-main class="un-locker">
        <el-image v-if="stateOpen" class="un-locker-icon mt-2" :src="LockerOpen" />
        <el-image v-else class="un-locker-icon" :src="LockerClose" />
      </el-main>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onUnmounted, onMounted, computed, reactive, watch } from 'vue'
import { FormRules, FormInstance } from 'element-plus'
import { CirclePlus } from '@element-plus/icons-vue'
import { IPublishPacket } from 'mqtt-packet'
import { useIcpClientStore } from '@/store/IcpClient'
import { useMqttStore } from '@/store/MqttStore'
import { useUniotStore } from '@/store/UniotStore'
import { defaultDomain, deviceStatusTopic } from '@/utils/mqttTopics'
import { decodeIntoJSON, decodeIntoString } from '@/utils/msgDecoder'
import { UniotDevice } from '@/types/uniot'
import { LockerTemplate } from '@/types/locker'
import { MqttMessageDeviceStatus } from '@/types/mqtt'
import LockerOpen from '@/assets/locker-open.svg'
import LockerClose from '@/assets/locker-close.svg'
import { Principal } from '@dfinity/principal'

interface UniotLockerDeviceViewProps {
  deviceId: bigint
  lockerId: bigint
  device: UniotDevice | undefined
  createLocker: boolean
}

type UniotDeviceEmits = {
  (e: 'created', item: { lockerId: bigint; device: UniotDevice }): void
}

type Form = {
  receiver: string
}

const props = defineProps<UniotLockerDeviceViewProps>()
const emit = defineEmits<UniotDeviceEmits>()

const icpClient = useIcpClientStore()
const mqttClient = useMqttStore()
const uniotClient = useUniotStore()
const loading = ref(false)

const statusParsed = ref('')
const statusOnline = ref(false)
const stateOpen = ref(true)
const statusTimestamp = ref(Date.now().toLocaleString())

const statusTopic = computed(() => deviceStatusTopic(defaultDomain, uniotClient.userId, props.device!.name))
// const stateTopic = computed(() => deviceLockerTopic(defaultDomain, uniotClient.userId, props.device.name))

const rules = reactive<FormRules<Form>>({
  receiver: [
    { required: true, message: 'Principal ID can not be empty', trigger: 'blur' },
    { pattern: /^([\w]{5}-){10}[\w]{3}$/, message: 'Invalid principal ID', trigger: 'blur' },
    { validator: checkReceiver, trigger: 'blur' }
  ]
})
const form = reactive<Form>({
  receiver: ''
})
const formRef = ref<FormInstance>()

onMounted(async () => {
  console.log('mounted:', props.deviceId, props.device)
  loading.value = true
  // workaround: wait while all topics will be unsubscribed
  await new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
  await subscribeDeviceTopics()
  await getLockerStatus()
  loading.value = false
})

watch(
  () => ({
    id: props.deviceId,
    device: props.device
  }),
  async (newValues, prevValues) => {
    if (newValues.device && newValues.id !== prevValues?.id) {
      if (prevValues?.device) {
        await mqttClient.unsubscribe(deviceStatusTopic(defaultDomain, uniotClient.userId, prevValues.device.name))
      }
      await subscribeDeviceTopics()
    }
  },
  { immediate: true }
)

watch(
  () => ({
    lockerId: props.lockerId
  }),
  async () => {
    await getLockerStatus()
  },
  { immediate: true }
)

onUnmounted(async () => {
  console.log('unmounted - unsubscribe')
  await mqttClient.unsubscribe(statusTopic.value)
  console.log('unmounted - unsubscribe finished')
})

async function subscribeDeviceTopics() {
  console.log('subscribeDeviceTopics:', statusTopic.value)
  try {
    await mqttClient.subscribe(statusTopic.value, onStatusMessage)
    console.log('subscribeDeviceTopics finished')
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

async function createLockerDevice() {
  loading.value = true
  try {
    const newLockerId = await icpClient.actor?.createLocker(uniotClient.userId, props.device!.name, 'lock')
    emit('created', { lockerId: newLockerId!, device: props.device! })
  } catch (error) {
    console.error(error)
  }
  loading.value = false
}

async function getLockerStatus() {
  try {
    const lockerDto = await icpClient.actor?.getLocker(props.lockerId)
    console.log('getLockerStatus:', lockerDto)
    if (lockerDto) {
      const locker = lockerDto[0]
      stateOpen.value = !locker?.locked || false
      form.receiver = locker?.receiver.toString() || ''
    }
  } catch (error) {
    console.error(error)
  }
}

async function closeLocker(formEl: FormInstance | undefined) {
  loading.value = true
  try {
    formEl?.clearValidate()
    if (await formEl?.validate()) {
      const receiverId = Principal.fromText(form.receiver)
      const result = await icpClient.actor?.closeLockerFor(props.lockerId, receiverId)
      if (result) {
        console.log('close Locker for:', form.receiver)
        stateOpen.value = false
      }
    }
  } catch (e) {
    console.error(e)
  }
  loading.value = false
}

async function openLocker() {
  loading.value = true
  try {
    const result = await icpClient.actor?.openLocker(props.lockerId)
    stateOpen.value = result || false
  } catch (e) {
    console.error(e)
  }
  loading.value = false

}

function checkReceiver(_: unknown, value: string, callback: (error?: Error) => void) {
  // TODO: turn on validation
  callback()
  // if (value === icpClient.principal.full) {
  //   callback(new Error('You can not assign a locker to yourself'))
  // } else {
  //   callback()
  // }
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
