/**
 * dsh-fee-meter 宿主入口骨架。
 *
 * 极简版:纯客户端 iframe 插件,host 端不提供任何服务/不挂载贡献/不启动轮询。
 * 本文件存在主要为满足 dsh 启动时的"入口产物"检查(package.json 的 main);
 * 实际费用展示逻辑全在浏览器端 ./client.js(设置页内嵌报表 iframe)。
 */
export const name = 'fee-meter'

/** 空实现:dsh 加载本模块时调用,无副作用。 */
export function apply() {
  /* no-op:纯客户端插件,host 端无服务 */
}
