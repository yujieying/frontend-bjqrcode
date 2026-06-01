<template>
  <div class="batch-page">
    <div class="page-nav">
      <el-button type="text" class="back-btn" @click="$router.push('/')">← 返回</el-button>
      <el-button type="text" class="switch-btn" @click="$router.push('/qrcode')">
        切换到单个生成 →
      </el-button>
    </div>

    <el-card class="batch-card" shadow="never">
      <h1 class="page-title">二维码批量生成器</h1>

      <div class="prefix-row">
        <el-select v-model="prefix" class="prefix-select">
          <el-option label="测试" value="https://fhh-sit.bgyfw.com/space-h5/?ID=" />
          <el-option label="生产" value="https://fhh.bgyfw.com/space-h5/?ID=" />
        </el-select>
      </div>

      <el-input
        type="textarea"
        :rows="12"
        v-model="jsonInput"
        placeholder="粘贴 JSON 数组或对象，程序会自动遍历 children 找到最深层叶节点生成二维码"
        class="json-input"
      />

      <div class="action-bar">
        <el-button type="primary" class="generate-btn" @click="generate" :loading="generating">
          批量生成
        </el-button>
        <el-button plain class="reset-btn" @click="reset">
          重置
        </el-button>
        <el-button type="text" class="example-btn" @click="drawerVisible = true">
          测试例子
        </el-button>
        <el-button type="text" class="example-btn" @click="sourceDialogVisible = true">
          来源图示
        </el-button>
      </div>

      <el-alert
        v-if="error"
        :title="error"
        type="error"
        show-icon
        :closable="false"
        class="error-alert"
      />

      <div v-if="buildings.length > 0" class="result-bar">
        共生成 {{ buildings.reduce((s, b) => s + b.floors.reduce((s2, f) => s2 + f.items.length, 0), 0) }} 个二维码
      </div>

      <div v-if="buildings.length > 0" class="buildings">
        <el-tabs v-model="activeTab" @tab-click="onTabClick">
          <el-tab-pane
            v-for="(building, bi) in buildings"
            :key="bi"
            :label="building.buildingName"
            :name="String(bi)"
          >
            <div v-for="(floor, fi) in building.floors" :key="floor.floorName + '-' + fi" class="floor">
              <div class="floor-title">{{ floor.floorName }}</div>
              <div class="qr-grid">
                <div
                  v-for="item in floor.items"
                  :key="item.nfcNo"
                  class="qr-card"
                  @click="previewQR(item)"
                >
                  <div class="qr-label">{{ item.name }}</div>
                  <div :id="'qr-' + batchKey + '-' + item.globalIdx" class="qr-container"></div>
                  <div class="qr-meta" v-if="item.nfcNo">NFC: {{ item.nfcNo }}</div>
                  <el-button
                    size="mini"
                    plain
                    class="copy-btn"
                    @click.stop="copyUrl(item.fullUrl)"
                  >
                    复制链接
                  </el-button>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>

    <el-drawer
      title="测试例子"
      :visible.sync="drawerVisible"
      direction="rtl"
      size="600px"
    >
      <div class="drawer-body">
        <p class="drawer-desc">以下是示例 JSON 数据，点击下方按钮复制后粘贴到输入框中即可测试：</p>
        <pre class="json-preview">{{ sampleJSON }}</pre>
        <el-button
          type="primary"
          class="copy-json-btn"
          @click="copySampleJSON"
          plain
        >
          复制 JSON
        </el-button>
      </div>
    </el-drawer>

    <el-dialog
      :visible.sync="dialogVisible"
      width="400px"
      top="8vh"
      :close-on-click-modal="true"
    >
      <div class="qr-preview-body" v-if="dialogItem">
        <div class="qr-preview-label">{{ dialogItem.name }}</div>
        <div class="qr-preview-container" ref="qrPreviewContainer"></div>
        <div class="qr-preview-url">{{ dialogItem.fullUrl }}</div>
        <div class="qr-preview-meta" v-if="dialogItem.nfcNo">NFC: {{ dialogItem.nfcNo }}</div>
        <el-button
          type="primary"
          class="qr-preview-copy"
          @click="copyUrl(dialogItem.fullUrl)"
          plain
        >
          复制链接
        </el-button>
      </div>
    </el-dialog>

    <el-dialog
      title="数据来源图示"
      :visible.sync="sourceDialogVisible"
      width="80vw"
      top="5vh"
      :close-on-click-modal="true"
    >
      <div class="source-img-wrapper">
        <img :src="baseUrl + 'data-source.png'" alt="数据来源图示" class="source-img" />
      </div>
    </el-dialog>
  </div>
</template>

<script>
import QRCode from 'qrcodejs2-fixes'

function collectLeafItems(node, pathNames) {
  const currentPath = [...pathNames, node.name || '']
  const hasChildren = node.children && Array.isArray(node.children) && node.children.length > 0
  if (!hasChildren) {
    const nfcNo = node.nfcNo || ''
    if (nfcNo) {
      return [{
        id: node.id || '',
        nfcNo,
        name: node.name || nfcNo,
        path: currentPath.join(' / '),
        fullUrl: '',
      }]
    }
    return []
  }
  const items = []
  for (const child of node.children) {
    items.push(...collectLeafItems(child, currentPath))
  }
  return items
}

import SAMPLE_JSON from '../data/sample-json.js'

export default {
  name: 'BatchPage',
  data() {
    return {
      prefix: 'https://fhh-sit.bgyfw.com/space-h5/?ID=',
      jsonInput: '',
      buildings: [],
      error: '',
      generating: false,
      batchKey: 0,
      activeTab: '0',
      drawerVisible: false,
      dialogVisible: false,
      dialogItem: null,
      sourceDialogVisible: false,
      sampleJSON: SAMPLE_JSON,
    }
  },
  computed: {
    baseUrl() {
      return import.meta.env.BASE_URL || '/'
    },
  },
  watch: {
    dialogVisible(val) {
      if (!val || !this.dialogItem) return
      this.$nextTick(() => {
        const el = this.$refs.qrPreviewContainer
        if (!el) return
        el.innerHTML = ''
        new QRCode(el, {
          text: this.dialogItem.fullUrl,
          width: 280,
          height: 280,
          colorDark: '#1a1a1a',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.H,
        })
      })
    },
  },
  created() {
    const cached = localStorage.getItem('batch_cache')
    if (!cached) return
    try {
      const { prefix, jsonInput } = JSON.parse(cached)
      if (jsonInput) {
        this.prefix = prefix || this.prefix
        this.jsonInput = jsonInput
        this.$nextTick(() => {
          this.generate()
        })
      }
    } catch {}
  },
  methods: {
    generate() {
      this.error = ''
      this.buildings = []
      this.batchKey++

      const raw = this.jsonInput.trim()
      if (!raw) {
        this.error = '请粘贴 JSON 数据'
        return
      }

      let data
      try {
        data = JSON.parse(raw)
      } catch {
        this.error = 'JSON 格式无效，请检查后重试'
        return
      }

      const list = Array.isArray(data) ? data : (Array.isArray(data.children) ? data.children : [])
      if (list.length === 0) {
        this.error = 'JSON 应为数组，或包含 children 数组'
        return
      }

      const buildings = []
      let totalCount = 0
      let globalIdx = 0

      for (const top of list) {
        const buildingName = top.name || '未知楼栋'
        const floors = top.children
        if (!Array.isArray(floors)) continue

        const buildingFloors = []
        for (const floor of floors) {
          const items = collectLeafItems(floor, [])
          if (items.length === 0) continue
          items.forEach(item => {
            item.fullUrl = this.prefix + item.nfcNo
            item.globalIdx = globalIdx++
          })
          buildingFloors.push({
            floorName: floor.name || '未知',
            items,
          })
          totalCount += items.length
        }

        if (buildingFloors.length > 0) {
          buildings.push({
            buildingName,
            floors: buildingFloors,
          })
        }
      }

      if (buildings.length === 0) {
        this.error = '未找到有效的楼栋和叶节点数据（需包含 nfcNo 字段）'
        return
      }

      this.buildings = buildings
      this.activeTab = '0'
      this.generating = false

      localStorage.setItem('batch_cache', JSON.stringify({
        prefix: this.prefix,
        jsonInput: this.jsonInput,
      }))

      this.$nextTick(() => {
        this.renderActiveQR()
      })
    },

    copyUrl(url) {
      navigator.clipboard.writeText(url).then(() => {
        this.$message({ message: '已复制', type: 'success', duration: 1200 })
      })
    },

    copySampleJSON() {
      navigator.clipboard.writeText(this.sampleJSON)
      this.jsonInput = this.sampleJSON
      this.$message({ message: 'JSON 已复制并填入', type: 'success', duration: 1200 })
      this.$nextTick(() => {
        this.generate()
        this.drawerVisible = false
      })
    },

    reset() {
      this.jsonInput = ''
      this.buildings = []
      this.batchKey++
      this.error = ''
      localStorage.removeItem('batch_cache')
    },

    previewQR(item) {
      this.dialogItem = item
      this.dialogVisible = true
    },

    onTabClick() {
      this.$nextTick(() => {
        this.renderActiveQR()
      })
    },

    renderActiveQR() {
      const bi = parseInt(this.activeTab, 10)
      const building = this.buildings[bi]
      if (!building) return
      for (const floor of building.floors) {
        for (const item of floor.items) {
          const el = document.getElementById('qr-' + this.batchKey + '-' + item.globalIdx)
          if (!el || el.children.length > 0) continue
          new QRCode(el, {
            text: item.fullUrl,
            width: 150,
            height: 150,
            colorDark: '#1a1a1a',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H,
          })
        }
      }
    },
  },
}
</script>

<style lang="scss" scoped>
.batch-page {
  padding: 20px 0;
}

.batch-card {
  border-radius: 16px;
  padding: 20px;
  min-height: calc(100vh - 80px);
  overflow: visible;

  :deep(.el-card__body) {
    overflow: visible;
  }
}

.page-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .back-btn {
    font-size: 14px;
    color: #999;
    padding: 0;

    &:hover {
      color: #409eff;
    }
  }

  .switch-btn {
    font-size: 13px;
    color: #409eff;
    padding: 0;

    &:hover {
      color: #337ecc;
    }
  }
}

.page-title {
  font-size: 22px;
  color: #1a1a1a;
  margin-bottom: 24px;
  text-align: center;
}

.prefix-row {
  margin-bottom: 16px;

  .prefix-select {
    width: 100%;

    :deep(.el-input__inner) {
      font-family: monospace;
      font-size: 13px;
      background: #eef0f5;
      border-color: #e0e0e0;
    }
  }
}

.json-input {
  :deep(textarea) {
    font-family: monospace;
    font-size: 13px;
    line-height: 1.6;
  }
}

.action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.generate-btn {
  flex: 1;
}

.example-btn {
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.reset-btn {
  font-size: 13px;
  white-space: nowrap;
  flex-shrink: 0;
}

.error-alert {
  margin-top: 12px;
}

.drawer-body {
  padding: 0 20px;

  .drawer-desc {
    font-size: 14px;
    color: #666;
    margin-bottom: 16px;
    line-height: 1.6;
  }

  .json-preview {
    background: #f5f7fa;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 16px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.7;
    color: #333;
    overflow: auto;
    max-height: calc(100vh - 200px);
    white-space: pre;
  }

  .copy-json-btn {
    width: 100%;
    margin-top: 16px;
  }
}

.result-bar {
  margin-top: 20px;
  font-size: 14px;
  color: #999;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.buildings {
  margin-top: 16px;

  :deep(.el-tabs__header) {
    margin: 0 0 16px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: #fff;
  }

  :deep(.el-tabs__item) {
    font-size: 14px;
    font-weight: 500;
    height: 40px;
    line-height: 40px;
  }
}

.qr-preview-body {
  text-align: center;
  padding: 10px 0;

  .qr-preview-label {
    font-size: 16px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 20px;
  }

  .qr-preview-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 280px;

    :deep(img) {
      border-radius: 8px;
    }
  }

  .qr-preview-url {
    font-size: 12px;
    color: #999;
    margin-top: 16px;
    word-break: break-all;
  }

  .qr-preview-meta {
    font-size: 12px;
    color: #409eff;
    font-family: monospace;
    margin-top: 6px;
  }

  .qr-preview-copy {
    margin-top: 16px;
    width: 200px;
  }
}

.source-img-wrapper {
  text-align: center;

  .source-img {
    max-width: 100%;
    border-radius: 8px;
  }
}

:deep(.el-dialog__wrapper) {
  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    background: #fff;
    border-radius: 8px;
  }
}

:deep(.v-modal) {
  opacity: 0.55;
}

.floor {
  margin-bottom: 20px;
  padding-left: 16px;

  .floor-title {
    font-size: 14px;
    font-weight: 600;
    color: #409eff;
    padding: 6px 12px;
    background: #ecf5ff;
    border-radius: 6px;
    margin-bottom: 8px;
    display: inline-block;
  }
}

.qr-grid {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 30px;
  padding: 30px;
  border-radius: 8px;
}

.floor:nth-child(odd) .qr-grid {
  border: 1px solid #dcdcdc;
  background: #ffffff;
}

.floor:nth-child(even) .qr-grid {
  border: 1px solid #f7f7f7;
  background: rgba(247,247,247, 0.35);
}

.qr-card {
  background: transparent;
  border: 1px solid #d6d6d6;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  gap: 6px;
  transition: border-color 0.2s;

  &:hover {
    border-color: #409eff;
  }

  .qr-label {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    text-align: center;
    width: 100%;
  }

  .qr-path {
    font-size: 11px;
    color: #bbb;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .qr-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 150px;

    :deep(img) {
      border-radius: 6px;
    }
  }

  .qr-meta {
    font-size: 11px;
    color: #409eff;
    font-family: monospace;
  }

  .copy-btn {
    width: 100%;
    margin-top: 4px;
  }
}
</style>