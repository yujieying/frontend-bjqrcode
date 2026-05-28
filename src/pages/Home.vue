<template>
  <div class="home">
    <div class="home-card">
      <div class="logo">
        <span class="logo-icon">QR</span>
      </div>
      <h1>二维码生成工具</h1>
      <p class="desc">快速生成带环境前缀的二维码链接，支持历史记录管理</p>
      <div class="actions">
        <el-button type="primary" size="large" class="action-btn" @click="$router.push('/qrcode')">
          单个生成
        </el-button>
        <el-button type="success" size="large" class="action-btn" @click="$router.push('/batch')">
          批量生成
        </el-button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Home',
}
</script>

<style lang="scss" scoped>
.home {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
}

.home-card {
  text-align: center;
  background: #fff;
  border-radius: 16px;
  padding: 60px 48px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  // max-width: 480px;
  width: 100%;
}

.logo {
  margin-bottom: 24px;

  .logo-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    border-radius: 18px;
    background: linear-gradient(135deg, #409eff, #337ecc);
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 1px;
  }
}

h1 {
  font-size: 26px;
  color: #1a1a1a;
  margin-bottom: 12px;
}

.desc {
  font-size: 15px;
  color: #999;
  margin-bottom: 32px;
  line-height: 1.6;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.action-btn {
  width: 180px;
  font-size: 16px;
}
</style>