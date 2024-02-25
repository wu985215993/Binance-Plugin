//导入node:fs模块
import fs from 'fs'
import chalk from 'chalk'

//输出提示 TODO颜色改改
logger.info(chalk.rgb(133, 245, 103)(`行情插件~~~~初始化~~~~~`))

if (!global.segment) {
  try {
    global.segment = (await import('oicq')).segment
  } catch (err) {
    global.segment = (await import('icqq')).segment
  }
}
/** 插件路径 */
const appsPath = './plugins/binance-plugin/apps'
//加载插件
const files = fs.readdirSync(appsPath).filter((file) => file.endsWith('.js'))

let ret = []

files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})

ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')

  if (ret[i].status != 'fulfilled') {
    logger.error(`载入插件错误：${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}

export { apps }
