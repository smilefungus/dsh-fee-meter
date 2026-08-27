/**
 * dsh-fee-meter 浏览器端 bundle(单文件,经 __ModuleLoader__ 加载)。
 *
 * 全局悬浮 UI:右下角悬浮按钮(距右下 70px) + 点击弹出 500x600 浮窗,
 * 浮窗内嵌 TokenPulse 报表页面。
 *  - 注入点:shell.overlay(dsh 的全局浮层 slot,参考 dsh-agent-teams / dshmarket)。
 * 样式沿用 --dsw-* 主题变量,跟随全局亮/暗主题。
 */
window.__ModuleLoader__.load({
  id: 'dsh-fee-meter',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')
    const { createElement: el, Fragment, useState, useCallback } = React
    // react-dom/client 用于直接挂载到 document.body(绕过 shell.overlay 容器的
    // stacking context 限制,避免被侧边栏挡住)。参考 @linxin666/dsh-pet 的做法。
    const { createRoot } = require('react-dom/client')

    // ── 数据源报表地址 ────────────────────────────────────────────────────
    const FEE_URL = 'http://10.10.1.21:1023/deepseek/'

    // ── 样式(悬浮按钮 + 浮窗,position:fixed 定位右下角) ──────────────────
    const css = [
      '/* dsh-fee-meter: 右下角悬浮按钮 + 费用浮窗 */',
      '.fm-fab{position:fixed;right:24px;bottom:72px;z-index:900;width:46px;height:46px;border-radius:50%;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.20);font-size:18px;font-weight:600;line-height:1;padding:0}',
      '.fm-fab:hover{background:var(--dsw-alias-interactive-bg-hover);transform:translateY(-1px)}',
      '.fm-fab:active{transform:translateY(0)}',
      '.fm-panel{position:fixed;right:14px;bottom:14px;width:400px;height:600px;max-width:calc(100vw - 20px);max-height:calc(100vh - 20px);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);box-shadow:0 12px 44px rgba(0,0,0,.30);z-index:899;display:flex;flex-direction:column;overflow:hidden}',
      '.fm-panel-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);flex:0 0 auto}',
      '.fm-panel-title{font-size:13px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}',
      '.fm-panel-mid{display:flex;align-items:center;gap:8px;flex:1 1 auto;min-width:0}',
      '.fm-panel-updated{font-size:11px;color:var(--dsw-alias-label-tertiary);white-space:nowrap;flex:0 0 auto}',
      '.fm-panel-updated.fresh{color:var(--dsw-alias-state-success-primary)}',
      '.fm-panel-actions{display:flex;align-items:center;gap:4px;flex:0 0 auto}',
      '.fm-panel-link{font-size:11px;color:var(--dsw-alias-label-tertiary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:30ch}',
      '.fm-panel-link:hover{color:var(--dsw-alias-label-secondary)}',
      '.fm-panel-icon-btn{font:inherit;font-size:14px;line-height:1;color:var(--dsw-alias-label-secondary);background:transparent;border:none;cursor:pointer;padding:4px 8px;border-radius:6px;flex:0 0 auto}',
      '.fm-panel-icon-btn:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.fm-panel-icon-btn.spin{animation:fm-spin 1s linear infinite}',
      '@keyframes fm-spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}',
      '.fm-panel-body{flex:1;min-height:0;position:relative}',
      '.fm-panel-iframe{position:absolute;inset:0;width:100%;height:100%;border:none;background:var(--dsw-alias-bg-base)}',
    ]
    const styleEl = document.createElement('style')
    styleEl.setAttribute('data-dsh-fee-meter', '')
    styleEl.textContent = css.join('\n')
    document.head.appendChild(styleEl)

    // 拼接带时间戳的报表 URL,强制浏览器每次用新 query 绕过 HTTP 缓存。
    // 参考 Higress WasmPlugin 缓存失效经验:在 URL 追加递增/时间戳 query
    // 是客户端最可靠的"强制拉取"手段,服务端无需改动。
    function buildFeeUrl() {
      const t = Date.now()
      try {
        const u = new URL(FEE_URL)
        u.searchParams.set('_t', String(t))
        return u.toString()
      } catch (_) {
        // 非标准 URL 兜底:原始 URL 拼 ?_t= 或 &_t=
        const joiner = FEE_URL.includes('?') ? '&' : '?'
        return FEE_URL + joiner + '_t=' + t
      }
    }

    // ── 悬浮按钮 + 浮窗组件 ───────────────────────────────────────────────
    function FeeOverlay() {
      const [open, setOpen] = useState(false)
      // nonce 每次变化都触发 iframe src 改变 → 浏览器重新加载最新内容。
      // 用 open→true 的时刻(用户点击打开按钮)初始化,保证每次"打开窗口"
      // 都拿最新数据;手动点击刷新按钮时再 bump一次。
      const [nonce, setNonce] = useState(() => Date.now())
      const [reloading, setReloading] = useState(false)
      const toggle = useCallback(() => setOpen((v) => {
        if (!v) setNonce(Date.now())   // 从 false→true(打开):刷新 nonce
        return !v
      }), [])
      const close = useCallback(() => setOpen(false), [])
      const refresh = useCallback(() => {
        setReloading(true)
        setNonce(Date.now())
        // "刷新中"动画维持 ~1s 给用户视觉反馈(实际 iframe 加载时间看网络)
        setTimeout(() => setReloading(false), 1000)
      }, [])

      const iframeSrc = useMemo(() => {
        try {
          const u = new URL(FEE_URL)
          u.searchParams.set('_t', String(nonce))
          return u.toString()
        } catch (_) {
          const joiner = FEE_URL.includes('?') ? '&' : '?'
          return FEE_URL + joiner + '_t=' + nonce
        }
      }, [nonce])

      // 浮窗打开时被 panel 盖住,用 panel 头部的 × 关闭;按钮始终渲染,
      // 关闭后按钮重新可见可点。
      return el(Fragment, null,
        // 悬浮按钮(距右下角 70px)
        el('button', {
          key: 'fab',
          className: 'fm-fab',
          type: 'button',
          title: '费用',
          'aria-label': '费用',
          onClick: toggle,
        }, '¥'),
        // 浮窗(500x600,右下角弹出)
        open ? el('div', { key: 'panel', className: 'fm-panel' },
          el('div', { className: 'fm-panel-head' },
            el('h3', { className: 'fm-panel-title' }, '费用'),
            el('a', {
              className: 'fm-panel-link',
              // "新窗口打开"也带时间戳,保证跳新窗口也是最新数据
              href: buildFeeUrl(),
              target: '_blank',
              rel: 'noreferrer',
              title: '用默认浏览器打开最新数据',
            }, '新窗口打开'),
            el('div', { className: 'fm-panel-actions' },
              el('button', {
                className: 'fm-panel-icon-btn' + (reloading ? ' spin' : ''),
                type: 'button',
                title: '刷新(获取最新数据)',
                'aria-label': '刷新',
                onClick: refresh,
              }, '⟳'),
              el('button', {
                className: 'fm-panel-icon-btn',
                type: 'button',
                title: '关闭',
                'aria-label': '关闭',
                onClick: close,
                style: { fontSize: '18px' },
              }, '×'))),
          el('div', { className: 'fm-panel-body' },
            el('iframe', {
              className: 'fm-panel-iframe',
              src: iframeSrc,
              title: '费用报表',
              // 不缓存:每次打开或刷新 nonce 变化,URL 都是新的,
              // 浏览器不会命中 HTTP disk cache/memory cache。
              loading: 'lazy',
            }))) : null)
    }

    // ── 插件主体(直接挂载到 document.body,绕过 shell.overlay 容器) ───────
    // 参考 @linxin666/dsh-pet:rc.6 shell 没有 root-scoped 全局浮层 slot,
    // shell.overlay 容器有 stacking context 限制(position:fixed 的 z-index
    // 被困在容器内,会被外部侧边栏挡住)。直接 createRoot 挂 document.body,
    // 悬浮按钮/浮窗才真正脱离任何容器,position:fixed 相对视口、z-index 最高。
    const inject = []

    async function apply(ctx) {
      // 单实例守卫:热重载/重复 apply 时先清理旧 root,避免残留多个悬浮按钮
      const existing = document.querySelector('[data-dsh-fee-meter-root]')
      if (existing) existing.remove()

      const container = document.createElement('div')
      container.dataset.dshFeeMeterRoot = ''
      container.dataset.dshPlugin = 'fee-meter'
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(el(FeeOverlay))

      // 生命周期:插件卸载时 unmount root + 移除容器(参考 dsh-pet 的 disposeUi)
      const dispose = () => {
        try { root.unmount() } catch (_) { /* root 已卸载,忽略 */ }
        if (container.parentNode) container.parentNode.removeChild(container)
      }
      if (typeof ctx.effect === 'function') {
        ctx.effect(() => dispose, 'fee-meter: floating root')
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
