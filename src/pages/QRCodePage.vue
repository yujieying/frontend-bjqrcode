<template>
  <div class="qrcode-page">
    <div class="page-nav">
      <el-button type="text" class="back-btn" @click="$router.push('/')">← 返回</el-button>
      <el-button type="text" class="switch-btn" @click="$router.push('/batch')">
        切换到批量生成 →
      </el-button>
    </div>
    <QRCodeGenerator />
  </div>
</template>

<script>
import QRCodeGenerator from '../components/QRCodeGenerator.vue'

export default {
  name: 'QRCodePage',
  components: { QRCodeGenerator },
}
</script>

<style lang="scss" scoped>
.qrcode-page {
  padding: 20px 0;
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
</style>