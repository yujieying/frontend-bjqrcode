import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../pages/Home.vue'
import QRCodePage from '../pages/QRCodePage.vue'
import BatchPage from '../pages/BatchPage.vue'

Vue.use(VueRouter)

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/qrcode', name: 'QRCode', component: QRCodePage },
  { path: '/batch', name: 'Batch', component: BatchPage },
]

export default new VueRouter({
  routes,
})