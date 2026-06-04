<script setup>
import KnowledgeGraphExplorer from '../../components/KnowledgeGraphExplorer.vue'
</script>

<template>
  <div class="kg-page">
    <!-- 管理端：可展开 + 审核（通过/拒绝） -->
    <KnowledgeGraphExplorer :readonly="false" />
  </div>
</template>

<style scoped>
.kg-page { position: relative; width: 100%; height: 100%; min-height: 560px; }
</style>
