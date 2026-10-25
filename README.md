# 错题成长岛

本地运行的青少年错题整理与间隔复习工作台。无需注册、服务器数据库、OCR 或外部 AI API。

## 本机打开与自动启动

Windows PowerShell：

```powershell
cd E:\obs\小号\mistake-growth-island
npm install
npm run dev
```

打开 http://localhost:3000 。生产构建：`npm run build`，生产启动：`npm run start`。

Windows 已可通过 `scripts/setup-local-autostart.ps1` 注册“当前用户登录后自动启动”任务。它使用项目内已有的生产构建，因此首次设置或修改代码后要先运行 `npm run build`。如果项目被移动到别处，应重新运行设置脚本。取消自动启动可运行 `scripts/remove-local-autostart.ps1`。自动启动只让**这台电脑**上的 `http://localhost:3000` 可用；它不是公开网址。

请固定使用同一网址。`localhost:3000`、`127.0.0.1:3000` 和以后发布的域名属于不同的浏览器存储空间，错题不会自动互通。迁移时应在旧网址的“设置”页导出备份，再在新网址的“设置”页导入。

## GitHub Pages 公开网址

本项目使用 GitHub Pages 托管，不需要 Vercel、服务器数据库或外部 AI API。为保证资源路径正确，请将仓库命名为 `AI-cuoti`。

1. 在 GitHub 网页新建公开仓库 `AI-cuoti`，不要勾选自动添加 README。
2. 进入仓库，选择 **Add file → Upload files**，上传本项目的源码文件，确保 `package.json`、`src/` 和 `.github/workflows/deploy-pages.yml` 都位于仓库根目录。
3. 打开仓库 **Settings → Pages**，在 **Build and deployment → Source** 选择 **GitHub Actions**。不必创建 GitHub 推荐的新工作流，本项目已有部署工作流。
4. 在 **Actions** 中确认 **Deploy to GitHub Pages** 成功；若在启用 Pages 前运行失败，可在工作流页面点击 **Run workflow** 重试。
5. 网址为 `https://achang-8.github.io/AI-cuoti/`（如果仓库所有者不是 `Achang-8`，网址中的用户名要对应修改）。后续提交到 `main` 分支会自动重新构建并发布。

GitHub Pages 构建时使用 `GITHUB_PAGES=true` 进行静态导出；本地开发仍使用 `npm run dev`。

公开网址可以从任何电脑打开，但数据仍由各访问者的浏览器 IndexedDB 单独保存。它不提供账号、跨设备同步或共同查看；浏览器清理数据会导致本地记录丢失。部署前请先备份现有错题。

## 功能

- 七个页面：学习首页、添加错题、我的错题本、复习挑战、错题分析、家长报告、设置。
- 首页突出今日任务和本周知识点排行；错题详情提供复习时间线，分析页可按知识点筛选，家长报告提供本周与上周对比。
- 图片压缩后作为 Blob 存入 IndexedDB；错题、复习历史、奖励、设置独立存储。
- 本地规则：新题次日；独立做对依次间隔 3、7、14、30 天；提示后做对 2 天；做错次日且连续正确归零。
- 每道题每天最多获得一颗复习星星。成就根据本地复习记录计算。
- 备份导出为 JSON，包含图片的 Base64 数据；导入先校验后在事务中合并，相同 ID 跳过。
- 演示数据带标记，可单独清除；真实数据不会被演示清理删除。
- 家长报告支持浏览器打印和保存 PDF。所有建议均由确定性规则生成。

## 目录

```text
src/app/page.tsx       静态入口和加载边界
src/app/workspace.tsx  七页面工作台与交互
src/app/globals.css    响应式样式与打印样式
src/lib/db.ts          IndexedDB 结构、复习规则、图片和备份
src/lib/insights.ts    首页建议、重复做错和周对比的确定性统计
tests/data.test.mts    本地数据和统计规则测试
```

## 数据说明

数据只保存在当前浏览器。清除站点数据或切换浏览器会看不到原记录，请定期到“设置”页导出完整备份。本机多人共用浏览器时也会共用这份记录。

复习记录新增可选的下次复习日期字段；旧记录会根据原复习日期和间隔回算，不需要清空或迁移 IndexedDB。

“计划任务完成率”使用范围内的到期计划和相应复习记录估算；手动改期会影响历史口径。报告不将复习次数解释为学习能力变化。

## 开发检查

```powershell
npx tsc --noEmit
npm run lint
npm run build
npm test
```

自动测试覆盖独立做对间隔、提示后做对、做错重置、旧记录兼容、关联数据删除、演示数据隔离、重复做错统计和周对比。浏览器手动检查覆盖首页、复习时间线、分析筛选、家长报告和手机底部导航。

