<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { executeStep, forceCompleteStep } from '@/api/maintenanceTask'
import { uploadImage } from '@/api/user'
import { notifyStore } from '@/stores/notifyStore'
import { stepStatus, stepActionable } from '@/constants/taskStatus'

const props = defineProps({
  step: { type: Object, required: true },
  taskId: { required: true },
  active: { type: Boolean, default: false },   // 是否当前应执行的步骤（展开执行面板）
  executing: { type: Boolean, default: false },// 任务是否处于 EXECUTING
})
const emit = defineEmits(['submitted', 'chat'])

const st = computed(() => stepStatus(props.step.status))
const canAct = computed(() => props.executing && props.active && stepActionable(props.step.status))
const rejected = computed(() => props.step.status === 'AI_REJECTED')

const exec = reactive({ note: '', images: [], confirmed: false })
const uploading = ref(false)
const submitting = ref(false)

async function onPickFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return
  uploading.value = true
  try {
    for (const f of files) {
      const res = await uploadImage(f)
      const url = res?.data || res?.url
      if (url) exec.images.push(url)
    }
  } catch (err) { ElMessage.error('图片上传失败：' + (err.message || '')) }
  finally { uploading.value = false }
}
function removeImage(i) { exec.images.splice(i, 1) }

async function submit() {
  const s = props.step
  if (s.requirePhoto && !exec.images.length) { ElMessage.warning('该步骤要求上传照片'); return }
  if (s.requireNote && !exec.note.trim()) { ElMessage.warning('该步骤要求填写备注'); return }
  if (s.isCheckpoint && !exec.confirmed) { ElMessage.warning('请先确认检查点'); return }
  submitting.value = true
  try {
    await executeStep(props.taskId, s.id, {
      images: exec.images, note: exec.note.trim(), checkpointConfirmed: exec.confirmed,
    })
    notifyStore.trackJob({ key: 'step:' + s.id, kind: 'step', refId: s.id, title: '步骤AI验证：' + (s.title || '') })
    ElMessage.success('已提交，AI 验证中…')
    emit('submitted')
  } catch (err) { ElMessage.error('提交失败：' + (err.message || '')) }
  finally { submitting.value = false }
}

async function forceComplete() {
  submitting.value = true
  try {
    await forceCompleteStep(props.taskId, props.step.id, exec.note.trim() || '工人确认无误')
    ElMessage.success('已强制完成该步骤')
    emit('submitted')
  } catch (err) { ElMessage.error('操作失败：' + (err.message || '')) }
  finally { submitting.value = false }
}
</script>

<template>
  <div class="step" :class="{ active: canAct, done: ['AI_PASSED','COMPLETED'].includes(step.status) }">
    <div class="s-head">
      <span class="s-no">{{ step.sortOrder }}</span>
      <span class="s-title">{{ step.title }}</span>
      <span class="s-badge" :style="{ color: st.color, background: st.bg }">
        <span v-if="st.spin" class="dot-spin" />{{ st.label }}
      </span>
    </div>

    <div class="s-body">
      <p v-if="step.content" class="s-content">{{ step.content }}</p>

      <div v-if="step.safetyNote" class="s-safety">⚠ 安全提示：{{ step.safetyNote }}</div>

      <div v-if="step.isCheckpoint && (step.checkpointItems||[]).length" class="s-check">
        <div class="s-check-h">合规检查点</div>
        <ul><li v-for="(c,i) in step.checkpointItems" :key="i">{{ c }}</li></ul>
      </div>

      <div class="s-meta">
        <span v-if="step.estimatedMinutes">⏱ 约 {{ step.estimatedMinutes }} 分钟</span>
        <span v-if="step.requirePhoto" class="req">需拍照</span>
        <span v-if="step.requireNote" class="req">需备注</span>
        <button class="s-chat" @click="emit('chat', step)">💬 答疑</button>
      </div>

      <!-- 已提交的内容 -->
      <div v-if="(step.images||[]).length" class="s-imgs">
        <img v-for="(u,i) in step.images" :key="i" :src="u" alt="" />
      </div>
      <p v-if="step.note && !canAct" class="s-note">备注：{{ step.note }}</p>

      <!-- AI 验证结果 -->
      <div v-if="step.aiPass !== null && step.aiPass !== undefined" class="s-ai" :class="step.aiPass ? 'ok' : 'no'">
        <b>{{ step.aiPass ? '✓ AI 验证通过' : '✕ AI 验证未通过' }}</b>
        <span v-if="step.aiConfidence != null" class="conf">置信度 {{ Math.round(Number(step.aiConfidence) * 100) }}%</span>
        <p v-if="step.aiReason" class="reason">{{ step.aiReason }}</p>
      </div>

      <!-- 执行面板（仅当前步骤、任务执行中） -->
      <div v-if="canAct" class="s-exec">
        <div class="imgs">
          <div v-for="(u,i) in exec.images" :key="i" class="img-item">
            <img :src="u" alt="" /><button class="img-x" @click="removeImage(i)">✕</button>
          </div>
          <label class="img-add" :class="{ busy: uploading }">
            <input type="file" accept="image/*" multiple hidden @change="onPickFiles" />
            <span v-if="uploading">上传中…</span><span v-else>＋ 照片</span>
          </label>
        </div>
        <el-input v-model="exec.note" type="textarea" :rows="2" placeholder="执行备注（如实际处理、读数、异常）" />
        <label v-if="step.isCheckpoint" class="ck">
          <input type="checkbox" v-model="exec.confirmed" /> 我已确认上述检查点全部合规
        </label>
        <div class="s-actions">
          <button class="act ok" :disabled="submitting" @click="submit">{{ rejected ? '重新提交' : '提交本步骤' }}</button>
          <button v-if="rejected" class="act force" :disabled="submitting" @click="forceComplete">强制完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.step { border: 1px solid #e6eaf1; border-radius: 12px; background: #fff; padding: 14px 16px; box-shadow: 0 2px 12px rgba(51,65,85,.05); }
.step.active { border-color: #3b82f6; box-shadow: 0 4px 18px rgba(59,130,246,.14); }
.step.done { background: #fcfefc; }
.s-head { display: flex; align-items: center; gap: 10px; }
.s-no { width: 24px; height: 24px; flex-shrink: 0; border-radius: 50%; background: #eaf2ff; color: #3b82f6;
  font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.s-title { flex: 1; font-size: 15px; font-weight: 600; color: #334155; }
.s-badge { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px; display: inline-flex; align-items: center; gap: 5px; }
.dot-spin { width: 9px; height: 9px; border-radius: 50%; border: 2px solid rgba(59,130,246,.3); border-top-color: #3b82f6; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.s-body { margin-top: 10px; padding-left: 34px; }
.s-content { margin: 0 0 8px; font-size: 14px; color: #475569; line-height: 1.7; white-space: pre-wrap; }
.s-safety { background: #fff7ed; border: 1px solid #fcd9a6; color: #c2410c; font-size: 13px; padding: 8px 12px; border-radius: 8px; margin-bottom: 8px; }
.s-check { background: #f5f9ff; border: 1px solid #e3ecfa; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; }
.s-check-h { font-size: 12px; font-weight: 700; color: #3b82f6; margin-bottom: 4px; }
.s-check ul { margin: 0; padding-left: 18px; font-size: 13px; color: #475569; }
.s-meta { display: flex; align-items: center; gap: 12px; font-size: 12px; color: #94a3b8; flex-wrap: wrap; }
.s-meta .req { color: #d97706; }
.s-chat { margin-left: auto; border: 1px solid #e6eaf1; background: #fff; color: #3b82f6; border-radius: 6px; padding: 3px 10px; font-size: 12px; cursor: pointer; }
.s-chat:hover { background: #f5f9ff; }
.s-imgs { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
.s-imgs img { width: 64px; height: 64px; object-fit: cover; border-radius: 6px; border: 1px solid #e6eaf1; }
.s-note { font-size: 13px; color: #475569; margin: 6px 0 0; }
.s-ai { margin-top: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13px; }
.s-ai.ok { background: #f0fdf4; border: 1px solid #bbf7d0; color: #16a34a; }
.s-ai.no { background: #fff7ed; border: 1px solid #fcd9a6; color: #c2410c; }
.s-ai .conf { margin-left: 8px; font-weight: 400; opacity: .8; }
.s-ai .reason { margin: 6px 0 0; color: #475569; line-height: 1.6; }
.s-exec { margin-top: 12px; display: flex; flex-direction: column; gap: 10px; }
.imgs { display: flex; flex-wrap: wrap; gap: 8px; }
.img-item { position: relative; width: 64px; height: 64px; border-radius: 8px; overflow: hidden; border: 1px solid #e6eaf1; }
.img-item img { width: 100%; height: 100%; object-fit: cover; }
.img-x { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border: none; border-radius: 50%; background: rgba(15,23,42,.6); color: #fff; font-size: 11px; cursor: pointer; line-height: 1; }
.img-add { width: 64px; height: 64px; border: 1px dashed #e6eaf1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #3b82f6; cursor: pointer; background: #f8faff; }
.img-add:hover { background: #eaf2ff; }
.ck { font-size: 13px; color: #475569; display: flex; align-items: center; gap: 6px; cursor: pointer; }
.s-actions { display: flex; gap: 10px; }
.act { padding: 8px 18px; border-radius: 8px; font-weight: 600; font-size: 13px; cursor: pointer; border: 1px solid; }
.act.ok { background: #3b82f6; color: #fff; border-color: #3b82f6; }
.act.ok:hover { background: #2563eb; }
.act.force { background: #fff; color: #d97706; border-color: #fcd9a6; }
.act.force:hover { background: #fff7ed; }
.act:disabled { opacity: .6; cursor: not-allowed; }
</style>
