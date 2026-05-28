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
                  <div class="qr-url" :title="item.fullUrl">{{ item.fullUrl }}</div>
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

const SAMPLE_JSON = JSON.stringify([
    {
        "id": "931089254397026304",
        "name": "12栋#2单元",
        "orderId": "385134017",
        "buildId": "931089254397026304",
        "nfcNumber": 22,
        "nfcSwipedNumber": 0,
        "systemTime": "2026-05-28T03:31:17.383+00:00",
        "voiceFilePath": null,
        "swiped": 0,
        "nfcPunchTime": null,
        "nfcNo": null,
        "punchRate": 0,
        "order": null,
        "spaceType": null,
        "workAreaType": 100,
        "workAreaTypeName": null,
        "planWorkAreaId": null,
        "planWorkAreaName": null,
        "children": [
            {
                "id": "2016349953245544449",
                "name": "公共",
                "orderId": "385134017",
                "buildId": "931089254397026304",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.383+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 1,
                "workAreaTypeName": "点位类型",
                "planWorkAreaId": 2059104700001489000,
                "planWorkAreaName": "12栋#2单元-B4-电梯轿厢-02",
                "children": [
                    {
                        "id": "2059104700001488897",
                        "name": "12栋#2单元-B4-电梯轿厢-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "2028091-1D2516C50C0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 1,
                        "workAreaTypeName": "点位类型",
                        "planWorkAreaId": 2059104700001489000,
                        "planWorkAreaName": "12栋#2单元-B4-电梯轿厢-01",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2059104700001488898",
                        "name": "12栋#2单元-B4-电梯轿厢-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "2028091-1D2516C50C0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 1,
                        "workAreaTypeName": "点位类型",
                        "planWorkAreaId": 2059104700001489000,
                        "planWorkAreaName": "12栋#2单元-B4-电梯轿厢-02",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": 1000
            },
            {
                "id": "2016349953245544449",
                "name": "B4",
                "orderId": "385134017",
                "buildId": "931089254397026304",
                "nfcNumber": 20,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.383+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 2016349953245544400,
                "planWorkAreaName": "B4",
                "children": [
                    {
                        "id": "2049659823797018626",
                        "name": "12栋#2单元-B4-地下楼层公区-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0006",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212929",
                        "name": "12栋#2单元-B4-地下楼层公区-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0005",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212930",
                        "name": "12栋#2单元-B4-地下楼层公区-03",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0004",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212931",
                        "name": "12栋#2单元-B4-地下楼层公区-04",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0003",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212932",
                        "name": "12栋#2单元-B4-地下楼层公区-05",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212933",
                        "name": "12栋#2单元-B4-地下楼层公区-06",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050434",
                        "name": "12栋#2单元-B4-大堂-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0018",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050435",
                        "name": "12栋#2单元-B4-大堂-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0017",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050436",
                        "name": "12栋#2单元-B4-大堂-03",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0016",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050437",
                        "name": "12栋#2单元-B4-大堂-04",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0015",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050438",
                        "name": "12栋#2单元-B4-大堂-05",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0014",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050439",
                        "name": "12栋#2单元-B4-大堂-06",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0013",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050440",
                        "name": "12栋#2单元-B4-大堂-07",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0012",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050441",
                        "name": "12栋#2单元-B4-大堂-08",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0011",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050442",
                        "name": "12栋#2单元-B4-大堂-09",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0010",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050443",
                        "name": "12栋#2单元-B4-大堂-10",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0009",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659793585446914",
                        "name": "12栋#2单元-B4-楼层公区-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0008",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659793585446915",
                        "name": "12栋#2单元-B4-楼层公区-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0007",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2059104700001488897",
                        "name": "12栋#2单元-B4-电梯轿厢-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "2028091-1D2516C50C0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2059104700001488898",
                        "name": "12栋#2单元-B4-电梯轿厢-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "2028091-1D2516C50C0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -4
            }
        ],
        "seqNo": null
    },
    {
        "id": "931089246037778432",
        "name": "12栋#1单元",
        "orderId": "385134017",
        "buildId": null,
        "nfcNumber": 26,
        "nfcSwipedNumber": 0,
        "systemTime": "2026-05-28T03:31:17.383+00:00",
        "voiceFilePath": null,
        "swiped": 0,
        "nfcPunchTime": null,
        "nfcNo": null,
        "punchRate": 0,
        "order": null,
        "spaceType": null,
        "workAreaType": 100,
        "workAreaTypeName": null,
        "planWorkAreaId": null,
        "planWorkAreaName": null,
        "children": [
            {
                "id": "1901590946751975427",
                "name": "1F",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.384+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 1901590946751975400,
                "planWorkAreaName": "1F",
                "children": [
                    {
                        "id": "1904334903849590785",
                        "name": "12栋#1单元-1F-电梯-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "1F",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904354784180097025",
                        "name": "12栋#1单元-1F-电梯-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "1F",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": 1
            },
            {
                "id": "1901590946743586818",
                "name": "B1",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 14,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.384+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 1901590946743586800,
                "planWorkAreaName": "B1",
                "children": [
                    {
                        "id": "1904343972751511553",
                        "name": "12栋#1单元-B1-电梯-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904350475491237889",
                        "name": "12栋#1单元-B1-电梯-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904357806761390082",
                        "name": "12栋#1单元-B1-电梯-03",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904358123934658562",
                        "name": "12栋#1单元-B1-电梯-04",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904363020985950210",
                        "name": "12栋#1单元-B1-电梯-05",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904363132793511938",
                        "name": "12栋#1单元-B1-电梯-06",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904465344869707777",
                        "name": "12栋#1单元-B1-电梯-07",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904727999576666113",
                        "name": "12栋#1单元-B1-电梯-08",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904812655391113217",
                        "name": "12栋#1单元-B1-电梯-09",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904833273071153153",
                        "name": "12栋#1单元-B1-电梯-10",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904833777679577089",
                        "name": "12栋#1单元-B1-电梯-11",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834029459406849",
                        "name": "12栋#1单元-B1-电梯-12",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834458024968194",
                        "name": "12栋#1单元-B1-电梯-13",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834788594860033",
                        "name": "12栋#1单元-B1-电梯-14",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -1
            },
            {
                "id": "1901590946747781123",
                "name": "B3",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.384+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 1901590946747781000,
                "planWorkAreaName": "B3",
                "children": [
                    {
                        "id": "1965954027241385986",
                        "name": "12栋#1单元-B3-喝咖啡卡-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202503-1D2525C40C1088",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B3",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2053755698584715266",
                        "name": "12栋#1单元-B3-楼栋cs-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203415-048A23DFW00105",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B3",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -3
            },
            {
                "id": "1901590946747781124",
                "name": "B4",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 5,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.384+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 1901590946747781000,
                "planWorkAreaName": "B4",
                "children": [
                    {
                        "id": "1984086513233752065",
                        "name": "12栋#1单元-B4-天台-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1005",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752066",
                        "name": "12栋#1单元-B4-天台-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1004",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752067",
                        "name": "12栋#1单元-B4-天台-03",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1003",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752068",
                        "name": "12栋#1单元-B4-天台-04",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752069",
                        "name": "12栋#1单元-B4-天台-05",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -4
            },
            {
                "id": "1901590946751975426",
                "name": "B5",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 3,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.383+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 1901590946751975400,
                "planWorkAreaName": "B5",
                "children": [
                    {
                        "id": "1965958999698440193",
                        "name": "12栋#1单元-B5-喝咖啡卡-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202503-1D2525C40C8081",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1937680250220892161",
                        "name": "12栋#1单元-B5-大堂-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "205925-1D2516C50C0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1937680250220892162",
                        "name": "12栋#1单元-B5-大堂-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.383+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "205925-1D2516C50C0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -5
            }
        ],
        "seqNo": null
    },
    {
        "id": "1060360778349999980",
        "name": "14栋#20单元",
        "orderId": "385134017",
        "buildId": "1060360778349999980",
        "nfcNumber": 3,
        "nfcSwipedNumber": 0,
        "systemTime": "2026-05-28T03:31:17.384+00:00",
        "voiceFilePath": null,
        "swiped": 0,
        "nfcPunchTime": null,
        "nfcNo": null,
        "punchRate": 0,
        "order": null,
        "spaceType": null,
        "workAreaType": 100,
        "workAreaTypeName": null,
        "planWorkAreaId": null,
        "planWorkAreaName": null,
        "children": [
            {
                "id": "1992770051483295746",
                "name": "B7",
                "orderId": "385134017",
                "buildId": "1060360778349999980",
                "nfcNumber": 3,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.384+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 2,
                "workAreaTypeName": "楼层",
                "planWorkAreaId": 1992770051483295700,
                "planWorkAreaName": "B7",
                "children": [
                    {
                        "id": "1992771044224720953",
                        "name": "14栋#20单元-B7-大堂-156",
                        "orderId": "385134017",
                        "buildId": "1060360778349999980",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203413-048A23DFW0003",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1992770051483295700,
                        "planWorkAreaName": "B7",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1992771044224720954",
                        "name": "14栋#20单元-B7-大堂-157",
                        "orderId": "385134017",
                        "buildId": "1060360778349999980",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203413-048A23DFW0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1992770051483295700,
                        "planWorkAreaName": "B7",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1992771044224720955",
                        "name": "14栋#20单元-B7-大堂-158",
                        "orderId": "385134017",
                        "buildId": "1060360778349999980",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203413-048A23DFW0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 2,
                        "workAreaTypeName": "楼层",
                        "planWorkAreaId": 1992770051483295700,
                        "planWorkAreaName": "B7",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -7
            }
        ],
        "seqNo": null
    },
    {
        "id": "931089254397026304",
        "name": "12栋#2单元消防通道1",
        "orderId": "385134017",
        "buildId": "931089254397026304",
        "nfcNumber": 20,
        "nfcSwipedNumber": 0,
        "systemTime": "2026-05-28T03:31:17.384+00:00",
        "voiceFilePath": null,
        "swiped": 0,
        "nfcPunchTime": null,
        "nfcNo": null,
        "punchRate": 0,
        "order": null,
        "spaceType": null,
        "workAreaType": 3,
        "workAreaTypeName": "消防通道1",
        "planWorkAreaId": 2016349953245544400,
        "planWorkAreaName": "B4",
        "children": [
            {
                "id": "2016349953245544449",
                "name": "B4",
                "orderId": "385134017",
                "buildId": "931089254397026304",
                "nfcNumber": 20,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.384+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道1",
                "planWorkAreaId": 2016349953245544400,
                "planWorkAreaName": "B4",
                "children": [
                    {
                        "id": "2049659823797018626",
                        "name": "12栋#2单元-B4-地下楼层公区-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0006",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212929",
                        "name": "12栋#2单元-B4-地下楼层公区-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0005",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212930",
                        "name": "12栋#2单元-B4-地下楼层公区-03",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0004",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212931",
                        "name": "12栋#2单元-B4-地下楼层公区-04",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0003",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212932",
                        "name": "12栋#2单元-B4-地下楼层公区-05",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659823801212933",
                        "name": "12栋#2单元-B4-地下楼层公区-06",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050434",
                        "name": "12栋#2单元-B4-大堂-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0018",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050435",
                        "name": "12栋#2单元-B4-大堂-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0017",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050436",
                        "name": "12栋#2单元-B4-大堂-03",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0016",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050437",
                        "name": "12栋#2单元-B4-大堂-04",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0015",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050438",
                        "name": "12栋#2单元-B4-大堂-05",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0014",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050439",
                        "name": "12栋#2单元-B4-大堂-06",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0013",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050440",
                        "name": "12栋#2单元-B4-大堂-07",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0012",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050441",
                        "name": "12栋#2单元-B4-大堂-08",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0011",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050442",
                        "name": "12栋#2单元-B4-大堂-09",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0010",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659774732050443",
                        "name": "12栋#2单元-B4-大堂-10",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0009",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659793585446914",
                        "name": "12栋#2单元-B4-楼层公区-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0008",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2049659793585446915",
                        "name": "12栋#2单元-B4-楼层公区-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.384+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203313-048A23DFW0007",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2059104700001488897",
                        "name": "12栋#2单元-B4-电梯轿厢-01",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "2028091-1D2516C50C0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2059104700001488898",
                        "name": "12栋#2单元-B4-电梯轿厢-02",
                        "orderId": "385134017",
                        "buildId": "931089254397026304",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "2028091-1D2516C50C0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 2016349953245544400,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -4
            }
        ],
        "seqNo": null
    },
    {
        "id": "931089246037778432",
        "name": "12栋#1单元消防通道1",
        "orderId": "385134017",
        "buildId": null,
        "nfcNumber": 26,
        "nfcSwipedNumber": 0,
        "systemTime": "2026-05-28T03:31:17.385+00:00",
        "voiceFilePath": null,
        "swiped": 0,
        "nfcPunchTime": null,
        "nfcNo": null,
        "punchRate": 0,
        "order": null,
        "spaceType": null,
        "workAreaType": 3,
        "workAreaTypeName": "消防通道1",
        "planWorkAreaId": 1901590946743586800,
        "planWorkAreaName": "B1",
        "children": [
            {
                "id": "1901590946743586818",
                "name": "1F",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.385+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道1",
                "planWorkAreaId": 1901590946751975400,
                "planWorkAreaName": "1F",
                "children": [
                    {
                        "id": "1904334903849590785",
                        "name": "12栋#1单元-1F-电梯-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "1F",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904354784180097025",
                        "name": "12栋#1单元-1F-电梯-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "1F",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": 1
            },
            {
                "id": "1901590946743586818",
                "name": "B1",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 14,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.385+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道1",
                "planWorkAreaId": 1901590946743586800,
                "planWorkAreaName": "B1",
                "children": [
                    {
                        "id": "1904343972751511553",
                        "name": "12栋#1单元-B1-电梯-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904350475491237889",
                        "name": "12栋#1单元-B1-电梯-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904357806761390082",
                        "name": "12栋#1单元-B1-电梯-03",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904358123934658562",
                        "name": "12栋#1单元-B1-电梯-04",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904363020985950210",
                        "name": "12栋#1单元-B1-电梯-05",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904363132793511938",
                        "name": "12栋#1单元-B1-电梯-06",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904465344869707777",
                        "name": "12栋#1单元-B1-电梯-07",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904727999576666113",
                        "name": "12栋#1单元-B1-电梯-08",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904812655391113217",
                        "name": "12栋#1单元-B1-电梯-09",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904833273071153153",
                        "name": "12栋#1单元-B1-电梯-10",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904833777679577089",
                        "name": "12栋#1单元-B1-电梯-11",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834029459406849",
                        "name": "12栋#1单元-B1-电梯-12",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834458024968194",
                        "name": "12栋#1单元-B1-电梯-13",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834788594860033",
                        "name": "12栋#1单元-B1-电梯-14",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -1
            },
            {
                "id": "1901590946743586818",
                "name": "B3",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.385+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道1",
                "planWorkAreaId": 1901590946747781000,
                "planWorkAreaName": "B3",
                "children": [
                    {
                        "id": "1965954027241385986",
                        "name": "12栋#1单元-B3-喝咖啡卡-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202503-1D2525C40C1088",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B3",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2053755698584715266",
                        "name": "12栋#1单元-B3-楼栋cs-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203415-048A23DFW00105",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B3",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -3
            },
            {
                "id": "1901590946743586818",
                "name": "B4",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 5,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.385+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道1",
                "planWorkAreaId": 1901590946747781000,
                "planWorkAreaName": "B4",
                "children": [
                    {
                        "id": "1984086513233752065",
                        "name": "12栋#1单元-B4-天台-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1005",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752066",
                        "name": "12栋#1单元-B4-天台-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1004",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752067",
                        "name": "12栋#1单元-B4-天台-03",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1003",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752068",
                        "name": "12栋#1单元-B4-天台-04",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752069",
                        "name": "12栋#1单元-B4-天台-05",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -4
            },
            {
                "id": "1901590946743586818",
                "name": "B5",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 3,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.385+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道1",
                "planWorkAreaId": 1901590946751975400,
                "planWorkAreaName": "B5",
                "children": [
                    {
                        "id": "1965958999698440193",
                        "name": "12栋#1单元-B5-喝咖啡卡-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202503-1D2525C40C8081",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1937680250220892161",
                        "name": "12栋#1单元-B5-大堂-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "205925-1D2516C50C0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1937680250220892162",
                        "name": "12栋#1单元-B5-大堂-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.385+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "205925-1D2516C50C0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道1",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -5
            }
        ],
        "seqNo": null
    },
    {
        "id": "931089246037778432",
        "name": "12栋#1单元消防通道2",
        "orderId": "385134017",
        "buildId": null,
        "nfcNumber": 26,
        "nfcSwipedNumber": 0,
        "systemTime": "2026-05-28T03:31:17.386+00:00",
        "voiceFilePath": null,
        "swiped": 0,
        "nfcPunchTime": null,
        "nfcNo": null,
        "punchRate": 0,
        "order": null,
        "spaceType": null,
        "workAreaType": 3,
        "workAreaTypeName": "消防通道2",
        "planWorkAreaId": 1901590946743586800,
        "planWorkAreaName": "B1",
        "children": [
            {
                "id": "1901590946743586818",
                "name": "1F",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.386+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道2",
                "planWorkAreaId": 1901590946751975400,
                "planWorkAreaName": "1F",
                "children": [
                    {
                        "id": "1904334903849590785",
                        "name": "12栋#1单元-1F-电梯-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "1F",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904354784180097025",
                        "name": "12栋#1单元-1F-电梯-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "1F",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": 1
            },
            {
                "id": "1901590946743586818",
                "name": "B1",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 14,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.386+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道2",
                "planWorkAreaId": 1901590946743586800,
                "planWorkAreaName": "B1",
                "children": [
                    {
                        "id": "1904343972751511553",
                        "name": "12栋#1单元-B1-电梯-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904350475491237889",
                        "name": "12栋#1单元-B1-电梯-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904357806761390082",
                        "name": "12栋#1单元-B1-电梯-03",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904358123934658562",
                        "name": "12栋#1单元-B1-电梯-04",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904363020985950210",
                        "name": "12栋#1单元-B1-电梯-05",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904363132793511938",
                        "name": "12栋#1单元-B1-电梯-06",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904465344869707777",
                        "name": "12栋#1单元-B1-电梯-07",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904727999576666113",
                        "name": "12栋#1单元-B1-电梯-08",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904812655391113217",
                        "name": "12栋#1单元-B1-电梯-09",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904833273071153153",
                        "name": "12栋#1单元-B1-电梯-10",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904833777679577089",
                        "name": "12栋#1单元-B1-电梯-11",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834029459406849",
                        "name": "12栋#1单元-B1-电梯-12",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834458024968194",
                        "name": "12栋#1单元-B1-电梯-13",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1904834788594860033",
                        "name": "12栋#1单元-B1-电梯-14",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516C50C0051",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946743586800,
                        "planWorkAreaName": "B1",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -1
            },
            {
                "id": "1901590946743586818",
                "name": "B3",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 2,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.386+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道2",
                "planWorkAreaId": 1901590946747781000,
                "planWorkAreaName": "B3",
                "children": [
                    {
                        "id": "1965954027241385986",
                        "name": "12栋#1单元-B3-喝咖啡卡-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202503-1D2525C40C1088",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B3",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "2053755698584715266",
                        "name": "12栋#1单元-B3-楼栋cs-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "203415-048A23DFW00105",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B3",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -3
            },
            {
                "id": "1901590946743586818",
                "name": "B4",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 5,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.386+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道2",
                "planWorkAreaId": 1901590946747781000,
                "planWorkAreaName": "B4",
                "children": [
                    {
                        "id": "1984086513233752065",
                        "name": "12栋#1单元-B4-天台-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1005",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752066",
                        "name": "12栋#1单元-B4-天台-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1004",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752067",
                        "name": "12栋#1单元-B4-天台-03",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1003",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752068",
                        "name": "12栋#1单元-B4-天台-04",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1984086513233752069",
                        "name": "12栋#1单元-B4-天台-05",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202508-1D2516D22D1001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946747781000,
                        "planWorkAreaName": "B4",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -4
            },
            {
                "id": "1901590946743586818",
                "name": "B5",
                "orderId": "385134017",
                "buildId": "931089246037778432",
                "nfcNumber": 3,
                "nfcSwipedNumber": 0,
                "systemTime": "2026-05-28T03:31:17.386+00:00",
                "voiceFilePath": null,
                "swiped": 0,
                "nfcPunchTime": null,
                "nfcNo": null,
                "punchRate": 0,
                "order": null,
                "spaceType": null,
                "workAreaType": 3,
                "workAreaTypeName": "消防通道2",
                "planWorkAreaId": 1901590946751975400,
                "planWorkAreaName": "B5",
                "children": [
                    {
                        "id": "1965958999698440193",
                        "name": "12栋#1单元-B5-喝咖啡卡-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "202503-1D2525C40C8081",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1937680250220892161",
                        "name": "12栋#1单元-B5-大堂-01",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "205925-1D2516C50C0001",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    },
                    {
                        "id": "1937680250220892162",
                        "name": "12栋#1单元-B5-大堂-02",
                        "orderId": "385134017",
                        "buildId": "931089246037778432",
                        "nfcNumber": 1,
                        "nfcSwipedNumber": 0,
                        "systemTime": "2026-05-28T03:31:17.386+00:00",
                        "voiceFilePath": null,
                        "swiped": 0,
                        "nfcPunchTime": null,
                        "nfcNo": "205925-1D2516C50C0002",
                        "punchRate": 0,
                        "order": null,
                        "spaceType": null,
                        "workAreaType": 3,
                        "workAreaTypeName": "消防通道2",
                        "planWorkAreaId": 1901590946751975400,
                        "planWorkAreaName": "B5",
                        "children": null,
                        "seqNo": null
                    }
                ],
                "seqNo": -5
            }
        ],
        "seqNo": null
    }
], null, 2)

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
      })
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
  padding: 8px;
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
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qr-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .qr-url {
    font-size: 11px;
    color: #bbb;
    text-align: center;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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