<template>
  <component :is="currentComponent" v-bind="currentProps" />
</template>

<script lang="ts" setup>
import { computed } from 'nativescript-vue'
import { getCurrentPageComponent, navigationState } from './utils/navigation'

const currentEntry = computed(() => navigationState.stack[navigationState.stack.length - 1])
const currentComponent = computed(() => getCurrentPageComponent(currentEntry.value.page))
const currentProps = computed(() => currentEntry.value.props)
</script>
