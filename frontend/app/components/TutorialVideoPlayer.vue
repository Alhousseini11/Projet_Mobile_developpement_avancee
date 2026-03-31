<template>
  <Page class="page">
    <ActionBar class="action-bar">
      <GridLayout columns="40,*" class="action-bar-content">
        <Label text="<" col="0" class="icon-back" @tap="closePlayer" />
        <Label text="Lecture video" col="1" class="action-title" />
      </GridLayout>
    </ActionBar>

    <GridLayout rows="auto,*" class="page-body">
      <GridLayout row="0" columns="*,auto" class="player-toolbar">
        <StackLayout col="0">
          <Label :text="tutorial.title" class="player-title" textWrap="true" />
          <Label text="Lecture integree au parcours tutoriels" class="player-subtitle" />
        </StackLayout>
        <GridLayout col="1" class="player-close" @tap="closePlayer">
          <Label text="Fermer" class="player-close-text" />
        </GridLayout>
      </GridLayout>

      <GridLayout row="1" class="player-frame">
        <WebView :src="playerHtmlSrc" class="player-webview" :iosAllowInlineMediaPlayback="true" />
      </GridLayout>
    </GridLayout>
  </Page>
</template>

<script lang="ts" setup>
import type { Tutorial } from '@/types/tutorial'
import { goBack } from '@/utils/navigation'

const props = defineProps<{
  tutorial: Tutorial
}>()

const tutorial = props.tutorial

const playerHtmlSrc = `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: #020617;
        color: #e5e7eb;
        font-family: Arial, sans-serif;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .shell {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .title {
        padding: 12px 14px 4px;
        font-size: 15px;
        font-weight: 700;
      }
      video {
        width: 100%;
        height: 100%;
        background: #000;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="title">${escapeHtml(tutorial.title)}</div>
      <video controls autoplay playsinline preload="metadata">
        <source src="${escapeAttribute(tutorial.videoUrl)}" type="video/mp4" />
      </video>
    </div>
  </body>
</html>`

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/"/g, '&quot;')
}

function closePlayer() {
  goBack()
}
</script>

<style scoped>
.page { background-color: #0f172a; }
.action-bar { background-color: #111827; color: #fff; }
.action-bar-content { padding: 0 12; height: 56; vertical-align: center; }
.icon-back { font-size: 20; color: #fff; }
.action-title { font-size: 18; font-weight: 700; color: #fff; vertical-align: center; }
.page-body { background-color: #0f172a; padding: 14; }
.player-toolbar { margin-bottom: 12; vertical-align: center; }
.player-title { color: #ffffff; font-size: 18; font-weight: 800; margin-right: 12; }
.player-subtitle { color: #94a3b8; font-size: 12; font-weight: 600; margin-top: 4; }
.player-close { background-color: #1f2937; border-radius: 999; padding: 10 14; vertical-align: top; }
.player-close-text { color: #ffffff; font-size: 12; font-weight: 700; text-align: center; }
.player-frame { background-color: #020617; border-radius: 14; overflow: hidden; }
.player-webview { width: 100%; height: 100%; }
</style>
