<template>
  <el-menu class="un-locker-menu" :default-active="selectedId" mode="vertical" @select="onSelect">
    <el-scrollbar>
      <el-menu-item-group v-if="props.lockers && props.lockers.length" title="Active Lockers">
        <el-menu-item v-for="locker in props.lockers" :key="locker.id.toString(10)" :index="locker.id.toString(10)">
          <el-icon><connection /></el-icon>
          <span>{{ locker.name }}</span>
        </el-menu-item>
      </el-menu-item-group>
      <el-menu-item-group v-if="props.history && props.history.length" title="History">
        <el-menu-item v-for="locker in props.history" :key="locker.id.toString(10)" :index="locker.id.toString(10)">
          <el-icon><circle-plus /></el-icon>
          <span>{{ locker.name }}</span>
        </el-menu-item>
      </el-menu-item-group>
      <el-row class="un-account mx-3">
        <el-col>
          <el-text>Principal ID:&nbsp;</el-text>
          <el-tooltip :content="icpClient.principal.full" placement="top">
            {{ icpClient.principal.trimmed }}
          </el-tooltip>
        </el-col>
        <el-col class="mt-3">
          <el-button class="full-width" @click="icpClient.logout()">Logout</el-button>
        </el-col>
      </el-row>
    </el-scrollbar>
  </el-menu>
</template>

<script setup lang="ts">
import { Connection, CirclePlus } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useIcpClientStore } from '@/store/IcpClient'

export type LockerMenuItem = {
  id: bigint
  name: string
}

type LockerMenuProps = {
  defaultSelectedId: bigint
  createId?: bigint
  lockers: LockerMenuItem[]
  history: LockerMenuItem[]
}

type LockerMenuEmits = {
  (e: 'select', item: { lockerId: bigint }): void
}

const icpClient = useIcpClientStore()

const props = defineProps<LockerMenuProps>()
const emit = defineEmits<LockerMenuEmits>()

const selectedId = computed(() => props.defaultSelectedId.toString(10))

function onSelect(index: string) {
  emit('select', { lockerId: BigInt(index) })
}
</script>

<style scoped lang="scss">
.un-locker-menu {
  border: none;
  border-right: 1px solid var(--uniot-color-dividers);
  min-width: 15rem;
  max-width: 15rem;
}

.un-account {
  position: absolute;
  bottom: 10px;
}
</style>
