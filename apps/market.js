import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import fetch from 'node-fetch'
import yaml from 'yaml'
import decimal from 'decimal.js'
const regCoinInfo = new RegExp(`^#现货[A-Z0-9]+`, 'g')
import chalk from 'chalk'

/**
 * TODO: 请求封装
 */
const myHeaders = new Headers()
myHeaders.append('User-Agent', 'Apifox/1.0.0 (https://apifox.com)')
myHeaders.append('Content-Type', 'application/json')

const requestOptions = {
  method: 'POST',
  headers: myHeaders,
  redirect: 'follow',
}

export class Market extends plugin {
  constructor() {
    super({
      name: '现货行情',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: regCoinInfo,
          fnc: 'coinInfo',
        },
      ],
    })
  }

  async coinInfo(e) {
    logger.info(chalk.rgb(133, 245, 103)(`行情插件查询中：${e.msg}`))
    const configPath =
      process.cwd().replace(/\\/g, '/') +
      '../plugins/binance-plugin/config/config.yaml'
    if (!configPath) {
      const errMsg = '请配置币安插件 config.yaml 文件哦！'
      logger.error(errMsg)
      e.reply(errMsg, true, { recallMsg: 5 })
    }
    const coinName = e.msg.replace('#现货', '').trim()
    const config = yaml.parse(fs.readFileSync(configPath, 'utf-8'))
    const apiUrl = config.binance.apiUrl
    const url = `${apiUrl}/api/rest/market/getTradingDay`
    const reqBody = JSON.stringify({
      symbol: coinName + 'USDT',
      options: {
        type: 'MINI',
        timeZone: '0',
      },
    })
    const res = await fetch(url, { ...requestOptions, body: reqBody })
      .then((response) => response.json())
      .catch(({ message }) => {
        logger.error('error', message)
        e.reply(message, true, { recallMsg: 5 })
      })
    if (res.statusCode === 500) {
      const errMsg = '币价查询失败请检查代币名称，或者稍等一会再试~~~~'
      logger.error(errMsg)
      e.reply(errMsg, true, { recallMsg: 5 })
    }
    // 定义昨日最高、昨日最低和收盘价 这里还有点儿问题用的是今日的待接口更新
    const yesterdayHigh = new decimal(result.highPrice)
    const yesterdayLow = new decimal(result.lowPrice)
    const closePrice = new decimal(result.openPrice)
    // 最新价格
    const lastPrice = new decimal(result.lastPrice)

    // 计算中轴
    const pivot = closePrice
      .plus(yesterdayHigh)
      .plus(yesterdayLow)
      .dividedBy(3)
      .toDecimalPlaces(4)

    // 计算支撑和压力
    const support = pivot.minus(yesterdayHigh.minus(pivot)).toDecimalPlaces(4)
    const resistance = pivot.plus(pivot.minus(yesterdayLow)).toDecimalPlaces(4)
    // 添加 Emoji
    const emoji = {
      support: '⬇️',
      resistance: '⬆️',
      pivot: '⚖️',
      currentPrice: '💲',
    }
    // 输出结果
    const formatMsg = `
    ${emoji.currentPrice} 当前价格: ${lastPrice}
    ${emoji.support} 支撑: ${support}
    ${emoji.resistance} 压力: ${resistance}
    ${emoji.pivot} 中轴: ${pivot}`
    e.reply(formatMsg, true)
    return
  }
}
