<script setup>
import KnowledgeGraphManager from '../../components/KnowledgeGraphManager.vue'
</script>

<template>
  <div class="kg-page">
    <!-- 管理端：知识图谱 CRUD 管理（设备/部件/故障/方案 + 待审核） -->
    <KnowledgeGraphManager />
  </div>
</template>

<style scoped>
.kg-page { position: relative; width: 100%; height: 100%; min-height: 560px; }
</style>
