<template>
  <Page @loaded="onPageLoaded" class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="goBack" />
        <Label text="Notifications" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="*,64" class="page-body">
      <ScrollView row="0">
        <StackLayout class="content">
          <GridLayout class="inline-back" @tap="goBack">
            <Label text="< Retour" class="inline-back-text" />
          </GridLayout>

          <GridLayout columns="*,auto" class="header-row">
            <StackLayout col="0">
              <Label text="Centre de notifications" class="section-title" />
              <Label :text="unreadLabel" class="section-subtitle" />
            </StackLayout>
            <GridLayout col="1" class="mark-all-btn" :class="{ disabled: unreadCount === 0 }" @tap="markAllAsRead">
              <Label text="Tout lire" class="mark-all-text" />
            </GridLayout>
          </GridLayout>

          <StackLayout v-if="notifications.length === 0" class="empty-card">
            <Label text="Aucune notification" class="empty-title" />
            <Label
              text="Vous recevrez ici les rappels de rendez-vous, paiements et mises a jour du garage."
              class="empty-copy"
              textWrap="true"
            />
          </StackLayout>

          <StackLayout v-else>
            <GridLayout
              v-for="item in notifications"
              :key="item.id"
              columns="28,*,auto"
              class="notification-card"
              :class="{ unread: !item.read }"
              @tap="markAsRead(item.id)"
            >
              <Label col="0" :text="item.read ? '✓' : '•'" class="notification-dot" :class="{ unread: !item.read }" />

              <StackLayout col="1" class="notification-copy">
                <Label :text="item.title" class="notification-title" textWrap="true" />
                <Label :text="item.message" class="notification-message" textWrap="true" />
                <Label :text="formatNotificationTime(item.createdAt)" class="notification-time" />
              </StackLayout>

              <Label col="2" :text="item.read ? '' : 'Nouveau'" class="notification-pill" />
            </GridLayout>
          </StackLayout>
        </StackLayout>
      </ScrollView>

      <GridLayout row="1" columns="*,*,*,*,*" class="bottom-nav">
        <GridLayout col="0" class="nav-item" @tap="navigateTo('home')">
          <StackLayout class="nav-stack">
            <Label text="🏠" class="nav-icon" />
            <Label text="Accueil" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="1" class="nav-item" @tap="navigateTo('reservations')">
          <StackLayout class="nav-stack">
            <Label text="📅" class="nav-icon" />
            <Label text="Reserver" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="2" class="nav-item" @tap="navigateTo('tutorials')">
          <StackLayout class="nav-stack">
            <Label text="🎥" class="nav-icon" />
            <Label text="Tutoriels" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="3" class="nav-item" @tap="navigateTo('vehicles')">
          <StackLayout class="nav-stack">
            <Label text="🚗" class="nav-icon" />
            <Label text="Vehicules" class="nav-label" />
          </StackLayout>
        </GridLayout>
        <GridLayout col="4" class="nav-item active" @tap="navigateTo('profile')">
          <StackLayout class="nav-stack">
            <Label text="👤" class="nav-icon" />
            <Label text="Profil" class="nav-label" />
          </StackLayout>
        </GridLayout>
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import { computed, ref } from 'nativescript-vue'
import NotificationsService from '@/services/NotificationsService'
import type { NotificationItem } from '@/types/notification'
import { formatNotificationTime } from '@/types/notification'
import { goBack as navigateBack, navigateToPage, type AppPage } from '@/utils/navigation'

const notifications = ref<NotificationItem[]>(NotificationsService.getFallbackNotifications())

const unreadCount = computed(() => notifications.value.filter(item => !item.read).length)
const unreadLabel = computed(() => {
  if (unreadCount.value <= 0) {
    return 'Tout est a jour.'
  }

  if (unreadCount.value === 1) {
    return '1 notification non lue.'
  }

  return `${unreadCount.value} notifications non lues.`
})

async function onPageLoaded() {
  notifications.value = await NotificationsService.getNotifications()
  console.log('Notifications page loaded')
}

function markAsRead(notificationId: string) {
  notifications.value = NotificationsService.markAsRead(notifications.value, notificationId)
}

function markAllAsRead() {
  if (unreadCount.value <= 0) {
    return
  }

  notifications.value = NotificationsService.markAllAsRead(notifications.value)
}

function navigateTo(page: AppPage) {
  void navigateToPage(page, { currentPage: 'notifications' })
}

function goBack() {
  void navigateBack()
}
</script>

<style scoped>
.page { background-color: #f5f6f8; }
.action-bar { background-color: #1f2733; color: #fff; }
.action-bar-content { padding: 0 12; height: 56; vertical-align: center; }
.icon-back { font-size: 20; color: #fff; }
.action-title { font-size: 18; font-weight: 700; color: #fff; vertical-align: center; }
.page-body { background-color: #f5f6f8; }
.content { padding: 16 16 24 16; }
.inline-back { width: 92; background-color: #ffffff; border-radius: 999; padding: 10 14; margin-bottom: 14; }
.inline-back-text { color: #1f2733; font-size: 13; font-weight: 800; }

.header-row {
  margin-bottom: 14;
}

.section-title {
  font-size: 22;
  font-weight: 800;
  color: #1f2733;
}

.section-subtitle {
  font-size: 12;
  color: #6b7280;
  margin-top: 3;
}

.mark-all-btn {
  background-color: #1f2733;
  border-radius: 999;
  padding: 8 12;
  vertical-align: center;
}

.mark-all-btn.disabled {
  opacity: 0.5;
}

.mark-all-text {
  color: #ffffff;
  font-size: 11;
  font-weight: 800;
  text-align: center;
}

.empty-card {
  background-color: #ffffff;
  border-radius: 14;
  padding: 18 16;
}

.empty-title {
  color: #111827;
  font-size: 16;
  font-weight: 800;
  margin-bottom: 6;
}

.empty-copy {
  color: #6b7280;
  font-size: 13;
}

.notification-card {
  background-color: #ffffff;
  border-radius: 14;
  padding: 12 14;
  margin-bottom: 10;
  border-width: 1;
  border-color: #e5e7eb;
}

.notification-card.unread {
  border-color: #fecaca;
  background-color: #fff7f7;
}

.notification-dot {
  color: #9ca3af;
  font-size: 22;
  text-align: center;
  vertical-align: top;
  margin-top: -2;
}

.notification-dot.unread {
  color: #dc2626;
}

.notification-copy {
  margin-right: 10;
}

.notification-title {
  color: #111827;
  font-size: 14;
  font-weight: 800;
}

.notification-message {
  color: #4b5563;
  font-size: 12;
  margin-top: 3;
}

.notification-time {
  color: #9ca3af;
  font-size: 11;
  margin-top: 5;
}

.notification-pill {
  color: #dc2626;
  font-size: 10;
  font-weight: 800;
  vertical-align: top;
}

.bottom-nav { background-color: #121826; border-top-width: 1; border-top-color: #1f2733; }
.nav-item { align-items: center; justify-content: center; padding: 8 2 6 2; }
.nav-stack { horizontal-align: center; vertical-align: center; height: 60; }
.nav-icon { font-size: 22; text-align: center; color: #f0f2f6; margin-bottom: 4; vertical-align: top; }
.nav-label { font-size: 11; font-weight: 700; text-align: center; color: #f0f2f6; vertical-align: bottom; }
.nav-item.active .nav-icon { color: #dc2626; }
.nav-item.active .nav-label { color: #dc2626; font-weight: 700; }
</style>
