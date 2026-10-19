import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const snackbar = ref({
    show: false,
    text: '',
    color: 'error',
    timeout: 3000
  })

  const show = (text, color = 'success', timeout = 3000) => {
    snackbar.value = {
      show: true,
      text,
      color,
      timeout
    }
  }

  const showError = (text) => show(text, 'error', 4000)
  const showSuccess = (text) => show(text, 'success', 3000)
  const showInfo = (text) => show(text, 'info', 3000)

  return { snackbar, show, showError, showSuccess, showInfo }
})
