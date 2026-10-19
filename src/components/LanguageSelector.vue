<template>
  <v-menu offset-y>
    <template v-slot:activator="{ props }">
      <slot name="activator" :props="props" :currentLocaleName="currentLocaleName">
        <v-btn v-bind="props" variant="text" class="px-2 text-none">
          <v-icon start>mdi-web</v-icon>
          {{ currentLocaleName }}
          <v-icon end>mdi-chevron-down</v-icon>
        </v-btn>
      </slot>
    </template>
    <v-list density="compact" min-width="120">
      <v-list-item v-for="lang in locales" :key="lang.value" @click="changeLanguage(lang.value)">
        <v-list-item-title :class="{ 'font-weight-bold text-primary': currentLocale === lang.value }">{{ lang.title }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useLocale } from 'vuetify'

const { locale } = useI18n()
const vuetifyLocale = useLocale()

const locales = [
  { title: 'English', value: 'en' },
  { title: 'Français', value: 'fr' },
  { title: 'العربية', value: 'ar' }
]

const currentLocale = computed(() => locale.value)
const currentLocaleName = computed(() => {
  const f = locales.find(l => l.value === currentLocale.value)
  return f ? f.title : 'Language'
})

const changeLanguage = (newLang) => {
  locale.value = newLang
  vuetifyLocale.current.value = newLang
  document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr'
  localStorage.setItem('app_language', newLang)
}
</script>
