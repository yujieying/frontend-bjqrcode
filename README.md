# QR Code 生成器

基于 Vue 2 + Vite + Element UI 的二维码生成工具，支持单个生成与批量生成。

## 在线地址

https://yujieying.github.io/frontend-bjqrcode/

## 本地开发

```bash
npm install
npm run dev
```

## 部署到 GitHub Pages

本项目使用 **GitHub Pages「从分支部署」**，发布配置如下：

| 配置项 | 值 |
|--------|-----|
| Source | Deploy from a branch |
| Branch | `master` |
| Folder | `/docs` |

> 说明：构建产物放在仓库的 `docs/` 目录，由 GitHub Pages 自动发布。  
> 账号若禁用了 GitHub Actions，请使用下方 `deploy:docs` 方式，不要使用 `npm run deploy`（`gh-pages` 分支方式）。

### 发布步骤

在项目根目录执行：

```bash
# 1. 构建并同步到 docs/
npm run deploy:docs

# 2. 提交并推送到 master
git add docs
git commit -m "deploy: update site"
git push origin master
```

推送后等待 **2～5 分钟**，再访问线上地址。

### 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 仅构建到 `dist/` |
| `npm run deploy:docs` | 构建并更新 `docs/`（**推荐，用于 Pages 部署**） |
| `npm run deploy` | 推送到 `gh-pages` 分支（当前 Pages 未使用，一般不需要） |

## 注意事项

1. **改代码后要先 `deploy:docs` 再 push**，否则线上仍是旧版本。
2. `vite.config.js` 中 `base` 需保持为 `/frontend-bjqrcode/`，与仓库名一致。
3. `docs/` 目录为构建产物，不要手动编辑；源文件在 `src/` 中修改。
4. 首次在 GitHub 配置 Pages：  
   https://github.com/yujieying/frontend-bjqrcode/settings/pages
