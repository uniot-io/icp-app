<template>
  <el-container class="container">
    <!-- <el-aside class="un-drawer">
      <el-image class="un-logo" :src="logo" fit="scale-down" />
      <el-menu
        class="un-menu"
        :router="true"
        :default-active="route.fullPath"
        text-color="#686f92"
        active-text-color="#09090c"
      >
        <el-scrollbar>
          <el-menu-item class="un-menu-item" index="/lockers">
            <i class="el-icon icon-doc-text-inv un-menu-icon"></i>
            <span class="un-menu-label">Lockers</span>
          </el-menu-item>
        </el-scrollbar>
      </el-menu>
      <el-row class="un-account">
        <el-col>
          <el-text size="large">Principal ID:&nbsp;</el-text>
          <el-tooltip :content="icpClient.principal.full" placement="top">
            {{ icpClient.principal.trimmed }}
          </el-tooltip>
        </el-col>
        <el-col>
          <el-button class="full-width" @click="icpClient.logout()">Logout</el-button>
        </el-col>
      </el-row>
    </el-aside> -->
    <el-main>
      <router-view />
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
// import logo from '@/assets/logo.svg'
import { onMounted, onUnmounted } from 'vue'
// import { useRoute } from 'vue-router'
import { useIcpClientStore } from '@/store/IcpClient'
import { useUniotStore } from '@/store/UniotStore'

// const route = useRoute()
const icpClient = useIcpClientStore()
const uniotClient = useUniotStore()

onMounted(() => {
  uniotClient.connect()
  uniotClient.processIdentity(icpClient.principal.full)
})

onUnmounted(() => {
  uniotClient.disconnect()
})
</script>

<style lang="scss" scoped>
.container {
  height: 100vh;
}

.un-drawer {
  background-color: var(--el-color-white);
  border-right: 1px solid var(--uniot-color-dividers);
  width: 18rem;
  display: flex;
  flex-direction: column;
  padding: 1rem 2rem;

  .un-logo {
    max-width: 100%;
  }

  .un-menu {
    flex: 1 0 auto;
    margin-top: 2rem;
    border: none;

    .un-menu-item {
      padding: 1rem;
      font-size: var(--el-font-size-medium);
      border-radius: var(--el-border-radius-base);

      &.is-active,
      &:active {
        background-color: var(--el-fill-color);

        .un-menu-icon {
          color: var(--el-color-primary);
        }
      }

      &:hover {
        background-color: var(--el-fill-color);
      }

      .un-menu-icon {
        font-size: 1.4rem;
      }

      .un-menu-label {
        padding-left: 1rem;
      }
    }
  }

  .un-account {
    * {
      margin-top: 0.5rem;
    }
    margin-top: 1rem;
  }
}
</style>
