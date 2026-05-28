<template>
  <div class="container">
    <h1>二维码单个生成器</h1>

    <div class="url-display">
      <el-select v-model="prefix" class="prefix-select">
        <el-option
          v-for="opt in prefixOptions"
          :key="opt.value"
          :label="opt.label"
          :value="opt.value"
        />
      </el-select>
      <el-input
        v-model="id"
        placeholder="输入 ID"
        class="id-input"
        @keydown.enter.native="generate"
      />
    </div>

    <el-button type="primary" class="generate-btn" @click="generate">
      生成二维码
    </el-button>

    <div
      v-show="id.trim()"
      class="copy-link"
      @click="copyLink"
    >
      {{ copyTip }}
    </div>

    <el-alert
      v-show="errorVisible"
      title="请输入 ID"
      type="error"
      :closable="false"
      show-icon
      center
      class="error-alert"
    />

    <div class="qr-wrapper" ref="qrWrapper">
      <span v-if="!qrCodeInstance" class="hint">输入 ID 后点击按钮生成二维码</span>
    </div>

    <div class="history" v-if="history.length > 0">
      <div class="history-header">
        <span class="history-title">历史记录</span>
        <el-button size="mini" type="text" class="history-clear" @click="clearAll">
          清空
        </el-button>
      </div>
      <div class="history-list">
        <div
          v-for="item in history"
          :key="item.url"
          class="history-item"
          @click="selectHistory(item)"
        >
          <span class="history-item-id">{{ extractId(item.url) || item.url }}</span>
          <el-button
            size="mini"
            type="text"
            class="history-del"
            @click.stop="deleteHistoryItem(item.url)"
          >
            ×
          </el-button>
        </div>
      </div>
    </div>
    <div class="history" v-else>
      <div class="history-header">
        <span class="history-title">历史记录</span>
      </div>
      <span class="history-empty">暂无记录</span>
    </div>
  </div>
</template>

<script>
import QRCode from 'qrcodejs2-fixes'

const HISTORY_KEY = 'qrcode_history'
const MAX_HISTORY = 20

function normalizeItem(item) {
  if (typeof item === 'string') return { url: item, note: '' }
  return { url: item.url || '', note: item.note || '' }
}

export default {
  name: 'QRCodeGenerator',
  data() {
    return {
      prefix: 'https://fhh-sit.bgyfw.com/space-h5/?ID=',
      id: '',
      qrCodeInstance: null,
      history: [],
      errorVisible: false,
      copyTip: '复制链接',
      prefixOptions: [
        { label: '测试', value: 'https://fhh-sit.bgyfw.com/space-h5/?ID=' },
        { label: '生产', value: 'https://fhh.bgyfw.com/space-h5/?ID=' },
      ],
    }
  },
  computed: {
    fullUrl() {
      return this.prefix + this.id.trim()
    },
  },
  created() {
    this.history = this.getHistory()
  },
  methods: {
    getHistory() {
      try {
        const data = JSON.parse(localStorage.getItem(HISTORY_KEY)) || []
        return data.map(normalizeItem)
      } catch {
        return []
      }
    },

    saveHistoryItem(url, note) {
      let list = this.getHistory().filter(item => item.url !== url)
      list.unshift({ url, note: note || '' })
      if (list.length > MAX_HISTORY) list = list.slice(0, MAX_HISTORY)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
      return list
    },

    generate() {
      const id = this.id.trim()
      if (!id) {
        this.errorVisible = true
        return
      }
      this.errorVisible = false

      const fullUrl = this.fullUrl
      this.$nextTick(() => {
        const wrapper = this.$refs.qrWrapper
        wrapper.innerHTML = ''
        this.qrCodeInstance = new QRCode(wrapper, {
          text: fullUrl,
          width: 180,
          height: 180,
          colorDark: '#1a1a1a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        })
      })

      const existing = this.history.find(i => i.url === fullUrl)
      const note = existing ? existing.note : id
      this.history = this.saveHistoryItem(fullUrl, note)
    },

    copyLink() {
      const id = this.id.trim()
      if (!id) return
      navigator.clipboard.writeText(this.fullUrl).then(() => {
        this.copyTip = '已复制'
        setTimeout(() => { this.copyTip = '复制链接' }, 1200)
      })
    },

    deleteHistoryItem(url) {
      let list = this.getHistory().filter(item => item.url !== url)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(list))
      this.history = list
    },

    clearAll() {
      this.$confirm('确定清空所有历史记录？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }).then(() => {
        localStorage.removeItem(HISTORY_KEY)
        this.history = []
      }).catch(() => {})
    },

    selectHistory(item) {
      this.id = this.extractId(item.url) || item.url
      this.generate()
    },

    extractId(url) {
      const prefixes = [
        'https://fhh-sit.bgyfw.com/space-h5/?ID=',
        'https://fhh.bgyfw.com/space-h5/?ID=',
      ]
      for (const p of prefixes) {
        if (url.startsWith(p)) return url.slice(p.length)
      }
      try {
        const u = new URL(url)
        for (const key of ['ID', 'id', 'variant', 'product_id', 'sku']) {
          const val = u.searchParams.get(key)
          if (val) return val
        }
        const segs = u.pathname.replace(/\/$/, '').split('/').filter(Boolean)
        if (segs.length === 0) return ''
        const long = segs.filter(s => s.length > 12 || /[A-Z0-9]{4,}/.test(s))
        return long.length > 0 ? long[long.length - 1] : segs[segs.length - 1]
      } catch {
        return ''
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.container {
  background: #fff;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
  min-height: calc(100vh - 80px);
}

h1 {
  font-size: 22px;
  color: #1a1a1a;
  margin-bottom: 24px;
}

.url-display {
  display: flex;
  margin-bottom: 8px;

  :deep(.prefix-select) {
    flex-shrink: 0;
    width: 90px;

    .el-input__inner {
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      font-family: monospace;
      font-size: 13px;
      background: #eef0f5;
      border-color: #e0e0e0;
    }
  }

  :deep(.id-input) {
    flex: 1;

    .el-input__inner {
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      border-left: none;
      font-family: monospace;
      font-size: 18px;
    }
  }
}

.generate-btn {
  width: 100%;
  margin-top: 12px;
}

.copy-link {
  margin-top: 6px;
  font-size: 12px;
  color: #bbb;
  cursor: pointer;
  transition: color 0.15s;
  user-select: none;

  &:hover {
    color: #409eff;
  }
}

.error-alert {
  margin-top: 12px;
}

.qr-wrapper {
  margin-top: 28px;
  min-height: 180px;
  display: flex;
  justify-content: center;
  align-items: center;

  :deep(img) {
    border-radius: 8px;
  }
}

.hint {
  color: #999;
  font-size: 14px;
}

.history {
  margin-top: 28px;
  text-align: left;

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    gap: 12px;

    .history-title {
      font-size: 14px;
      color: #999;
      white-space: nowrap;
    }

    .history-clear {
      font-size: 11px;
      color: #ccc;
      white-space: nowrap;
      flex-shrink: 0;

      &:hover {
        color: #ef4444;
      }
    }
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .history-item {
      padding: 8px 14px;
      background: #f5f6f8;
      border-radius: 8px;
      font-size: 14px;
      color: #333;
      cursor: pointer;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      gap: 8px;

      &:hover {
        background: #e8ebf5;
      }

      .history-item-id {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 500;
        font-family: monospace;
      }

      .history-del {
        flex-shrink: 0;
        font-size: 16px;
        color: #ccc;
        padding: 0;
        min-width: 24px;

        &:hover {
          color: #ef4444;
        }
      }
    }
  }
}

.history-empty {
  color: #ccc;
  font-size: 13px;
}
</style>