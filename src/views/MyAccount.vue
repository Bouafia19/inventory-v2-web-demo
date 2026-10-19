<template>
  <div class="my-account-page">
    <PageHeader :title="$t('account.title')" />
    
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="mb-4" variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon start color="primary" class="me-2">mdi-account</v-icon>
            {{ $t('account.profile') }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="mb-3">
              <div class="text-caption text-medium-emphasis">{{ $t('account.username') }}</div>
              <div class="text-body-1">{{ auth.user?.username }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">{{ $t('account.role') }}</div>
              <div class="text-body-1">{{ auth.user?.role }}</div>
            </div>
          </v-card-text>
        </v-card>

        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon start color="primary" class="me-2">mdi-web</v-icon>
            {{ $t('account.preferences') }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="mb-3">
              <div class="text-caption text-medium-emphasis mb-1">{{ $t('account.preferredLanguage') }}</div>
              <LanguageSelector>
                <template v-slot:activator="{ props, currentLocaleName }">
                  <v-btn v-bind="props" variant="outlined" block class="justify-space-between text-none">
                    {{ currentLocaleName }}
                    <v-icon end>mdi-chevron-down</v-icon>
                  </v-btn>
                </template>
              </LanguageSelector>
            </div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card variant="outlined">
          <v-card-title class="d-flex align-center">
            <v-icon start color="primary" class="me-2">mdi-shield-lock-outline</v-icon>
            {{ $t('account.security') }}
          </v-card-title>
          <v-divider></v-divider>
          <v-card-text>
            <div class="mb-4">
              <div class="text-caption text-medium-emphasis">{{ $t('account.password') }}</div>
              <div class="text-body-1">********</div>
            </div>
            <v-btn color="primary" variant="flat" @click="changePasswordDialog = true">
              {{ $t('account.changePassword') }}
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <ChangePasswordDialog v-model="changePasswordDialog" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth.js'
import PageHeader from '../components/PageHeader.vue'
import LanguageSelector from '../components/LanguageSelector.vue'
import ChangePasswordDialog from '../components/ChangePasswordDialog.vue'

const auth = useAuthStore()
const changePasswordDialog = ref(false)
</script>
