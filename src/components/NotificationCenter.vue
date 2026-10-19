<template>
  <v-menu
    v-model="menuOpen"
    offset-y
    :close-on-content-click="false"
    location="bottom end"
    max-width="420"
    min-width="360"
    transition="slide-y-transition"
  >
    <!-- Activator Button -->
    <template v-slot:activator="{ props }">
      <v-tooltip :text="$t('notifications.title')" location="bottom">
        <template v-slot:activator="{ props: tooltipProps }">
          <v-btn
            v-bind="{ ...props, ...tooltipProps }"
            variant="text"
            icon
            class="topbar-item notification-center-btn"
            :aria-label="notificationAriaLabel"
          >
            <v-badge
              :content="unreadCount"
              :model-value="unreadCount > 0"
              color="error"
              location="top end"
              offset-x="2"
              offset-y="2"
              max="99"
              class="notification-badge"
            >
              <v-icon color="#F59E0B" class="icon-transition">mdi-bell-outline</v-icon>
            </v-badge>
          </v-btn>
        </template>
      </v-tooltip>
    </template>

    <!-- Notification Panel Popover -->
    <v-card class="elevation-10 rounded-lg notification-panel border">
      <!-- Header -->
      <div class="d-flex align-center justify-space-between px-4 py-3 border-b bg-surface">
        <div class="d-flex align-center">
          <span class="text-subtitle-1 font-weight-bold text-slate-800">{{ $t('notifications.title') }}</span>
          <v-chip
            v-if="unreadCount > 0"
            size="x-small"
            color="primary"
            variant="flat"
            class="ms-2 font-weight-bold"
          >
            {{ unreadCount }}
          </v-chip>
        </div>

        <div class="d-flex align-center">
          <v-btn
            v-if="unreadCount > 0"
            variant="text"
            size="small"
            color="primary"
            class="text-none px-2 font-weight-medium mark-all-read-btn"
            @click="notificationStore.markAllAsRead"
          >
            <v-icon start size="small">mdi-check-all</v-icon>
            {{ $t('notifications.markAllAsRead') }}
          </v-btn>

          <v-btn
            v-if="notifications.length > 0"
            variant="text"
            size="small"
            color="secondary"
            icon
            class="ms-1"
            :title="$t('notifications.clearAll')"
            @click="notificationStore.clearAll"
          >
            <v-icon size="small">mdi-delete-sweep-outline</v-icon>
          </v-btn>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="notifications.length === 0" class="pa-8 text-center text-medium-emphasis">
        <v-avatar size="64" color="grey-lighten-4" class="mb-3">
          <v-icon size="32" color="grey-darken-1">mdi-bell-sleep-outline</v-icon>
        </v-avatar>
        <div class="text-subtitle-2 font-weight-bold text-slate-700 mb-1">{{ $t('notifications.noNotifications') }}</div>
        <div class="text-caption text-slate-400">{{ $t('notifications.allCaughtUp') }}</div>
      </div>

      <!-- Notification List -->
      <v-list v-else density="comfortable" class="pa-0 notification-list" max-height="400" style="overflow-y: auto;">
        <template v-for="(item, index) in sortedNotifications" :key="item.id">
          <v-list-item
            :class="[
              'notification-item px-4 py-3',
              { 'notification-unread bg-blue-50': !item.read }
            ]"
            :ripple="true"
            @click="handleItemClick(item)"
          >
            <!-- Prepend Icon -->
            <template v-slot:prepend>
              <v-avatar size="36" :color="getTypeColor(item.type) + '-lighten-5'" class="me-3">
                <v-icon :color="getTypeColor(item.type)" size="20">
                  {{ getTypeIcon(item.type) }}
                </v-icon>
              </v-avatar>
            </template>

            <!-- Title & Relative Time -->
            <v-list-item-title class="d-flex align-center justify-space-between mb-1">
              <span :class="['text-body-2', item.read ? 'font-weight-medium text-slate-700' : 'font-weight-bold text-slate-900']">
                {{ item.title }}
              </span>
              <span class="text-caption text-slate-400 text-no-wrap ms-2">
                {{ formatTimeAgo(item.timestamp) }}
              </span>
            </v-list-item-title>

            <!-- Message Body -->
            <v-list-item-subtitle class="text-caption text-slate-600 notification-message">
              {{ item.message }}
            </v-list-item-subtitle>

            <!-- Append Unread Dot & Dismiss Action -->
            <template v-slot:append>
              <div class="d-flex align-center ms-2">
                <span v-if="!item.read" class="unread-dot me-2"></span>
                <v-btn
                  icon="mdi-close"
                  size="x-small"
                  variant="text"
                  color="grey"
                  class="dismiss-btn"
                  :title="$t('notifications.dismiss')"
                  @click.stop="notificationStore.removeNotification(item.id)"
                ></v-btn>
              </div>
            </template>
          </v-list-item>
          <v-divider v-if="index < sortedNotifications.length - 1" :key="'div-' + item.id"></v-divider>
        </template>
      </v-list>
    </v-card>
  </v-menu>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useNotificationStore } from '../stores/notifications.js'

const router = useRouter()
const { t } = useI18n()
const notificationStore = useNotificationStore()

const menuOpen = ref(false)

const notifications = computed(() => notificationStore.notifications)
const sortedNotifications = computed(() => notificationStore.sortedNotifications)
const unreadCount = computed(() => notificationStore.unreadCount)

const notificationAriaLabel = computed(() => {
  const title = t('notifications.title') || 'Notifications'
  return unreadCount.value > 0
    ? `${title}, ${unreadCount.value} ${t('notifications.unreadCount', { count: unreadCount.value })}`
    : title
})

const getTypeColor = (type) => {
  switch (type) {
    case 'success': return 'success'
    case 'warning': return 'warning'
    case 'error': return 'error'
    case 'info':
    default: return 'info'
  }
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'success': return 'mdi-check-circle'
    case 'warning': return 'mdi-alert'
    case 'error': return 'mdi-alert-circle'
    case 'info':
    default: return 'mdi-information'
  }
}

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return ''
  
  const diff = Math.max(0, Date.now() - date.getTime())
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return t('notifications.justNow') || 'Just now'
  if (minutes < 60) return (t('notifications.minutesAgo', { m: minutes }) || '{m}m ago').replace('{m}', minutes)
  if (hours < 24) return (t('notifications.hoursAgo', { h: hours }) || '{h}h ago').replace('{h}', hours)
  return (t('notifications.daysAgo', { d: days }) || '{d}d ago').replace('{d}', days)
}

const handleItemClick = (item) => {
  if (!item.read) {
    notificationStore.markAsRead(item.id)
  }
  if (item.route) {
    menuOpen.value = false
    router.push(item.route)
  }
}
</script>

<style scoped>
.notification-panel {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.notification-item {
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.notification-item:hover {
  background-color: rgba(0, 0, 0, 0.04) !important;
}

.notification-unread {
  background-color: rgba(37, 99, 235, 0.06);
}

.notification-message {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
  line-height: 1.35;
}

.unread-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #2563EB;
  display: inline-block;
  flex-shrink: 0;
}

.dismiss-btn {
  opacity: 0.5;
  transition: opacity 0.2s;
}

.notification-item:hover .dismiss-btn {
  opacity: 1;
}

:deep(.v-list-item__content) {
  overflow: hidden;
}
</style>
