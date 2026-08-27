# dsh-fee-meter

> **私用插件**:数据源地址是作者内网地址,开源仅供学习/参考。直接安装后**看不到数据**——需先把地址改成你自己的费用报表 URL(见下文[修改数据源地址](#修改数据源地址))。

dsh 宿主的费用看板插件。在 dsh 界面右下角(距视口边 70px)悬浮一个 ¥ 按钮,点击弹出 500×600 浮窗,用 iframe 嵌入费用报表页面。

## 功能

- **悬浮按钮**:固定在视口右下角 70px 处,¥ 图标,点击切换浮窗显隐
- **费用浮窗**:500×600,头部带标题 + 「新窗口打开」链接 + × 关闭,body 是 iframe 嵌入报表
- **脱离容器限制**:直接挂载到 `document.body`(参考 `@linxin666/dsh-pet` 的做法),绕过 `shell.overlay` 容器的 stacking context 限制,不会被侧边栏挡住
- **跟随主题**:全部使用 `--dsw-*` 主题变量,自动适配亮/暗
- **零运行时依赖**:不需要任何 npm 包,纯客户端

## 安装

```powershell
dsh plugin --profile web add github:smilefungus/dsh-fee-meter
```

仓库地址:https://github.com/smilefungus/dsh-fee-meter

安装后**重启 dsh 宿主**,悬浮按钮出现在右下角。

## 卸载

```powershell
dsh plugin --profile web remove dsh-fee-meter
```

然后重启 dsh 宿主。

## 目录结构

```
dsh-fee-meter/
├─ lib/
│  ├─ client.js         # 浏览器端:悬浮按钮 + 浮窗,直接挂 document.body
│  └─ index.js          # host 端空骨架(仅满足入口检查,不提供任何服务)
├─ cordis.patch.yml     # insert 行(host + browser 两端同时挂载)
├─ package.json        # dsh.bundle + dsh.client 声明
├─ .gitignore
└─ README.md
```
