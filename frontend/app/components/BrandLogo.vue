<template>
  <GridLayout class="brand-logo" :class="size">
    <Image src="~/assets/Logo-centré.png" stretch="aspectFit" class="brand-logo-image" />
  </GridLayout>
</template>

<script lang="ts" setup>
withDefaults(
  defineProps<{
    size?: 'hero' | 'compact'
  }>(),
  {
    size: 'hero'
  }
)
</script>

<style scoped>
.brand-logo {
  horizontal-align: center;
  vertical-align: center;
}

.brand-logo-image {
  stretch: aspectFit;
}

.brand-logo.hero {
  width: 210;
  height: 180;
}

.brand-logo.compact {
  width: 146;
  height: 50;
}
</style>