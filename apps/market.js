import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import yaml from 'yaml'
import decimal from 'decimal.js'
const regCoinInfo = new RegExp(`^#现货[A-Za-z0-9]+`, 'g')
import chalk from 'chalk'
import { getKlineCandlestickData } from '../constants/api.js'
import request from '../utils/request.js'

const requestOptions = {
  method: 'POST',
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
    logger.info(chalk.rgb(133, 245, 103)(`- 行情插件查询中：${e.msg}`))
    const configPath =
      process.cwd().replace(/\\/g, '/') +
      '/plugins/binance-plugin/config/config.yaml'
    if (!configPath) {
      const errMsg = '请配置币安插件 config.yaml 文件哦！'
      logger.error(errMsg)
      e.reply(errMsg, true, { recallMsg: 5 })
    }
    const coinName = e.msg.replace('#现货', '').trim()
    const config = yaml.parse(fs.readFileSync(configPath, 'utf-8'))
    const apiUrl = config.binance.apiUrl
    const url = `${apiUrl}${getKlineCandlestickData}`
    const symbol = coinName.toUpperCase() + 'USDT'

    const reqBody = {
      symbol,
      interval: '1d',
      options: {
        timeZone: '0',
        // 获取从当前天到之前天的数据，此处只获取最新数据昨天和今天的数据
        limit: 2,
      },
    }

    try {
      const result = await request(url, { ...requestOptions, body: reqBody })
      console.log(data)

      if (result.statusCode === 500) {
        const errMsg = '币价查询失败请检查代币名称，或者稍等一会再试~~~~'
        logger.error(errMsg)
        e.reply(errMsg, true, { recallMsg: 5 })
      }
      // 定义昨日最高、昨日最低和收盘价 这里还有点儿问题用的是今日的待接口更新
      const yesterdayHigh = new decimal(result[0].highPrice)
      const yesterdayLow = new decimal(result[0].lowPrice)
      const closePrice = new decimal(result[0].openPrice)
      // 最新价格
      const lastPrice = new decimal(result[1].closePrice)

      // 计算中轴
      const pivot = closePrice
        .plus(yesterdayHigh)
        .plus(yesterdayLow)
        .dividedBy(3)
        .toDecimalPlaces(4)

      // 计算支撑和压力
      const support = pivot.minus(yesterdayHigh.minus(pivot)).toDecimalPlaces(4)
      const resistance = pivot
        .plus(pivot.minus(yesterdayLow))
        .toDecimalPlaces(4)
      // 计算波动百分比
      const changePercent = lastPrice
        .minus(result[0].closePrice)
        .dividedBy(result[0].closePrice)
        .times(100)
        .toDecimalPlaces(2)

      // 输出结果
      const formatMsg = `${coinName} (${changePercent}%)
当前价格:    ${lastPrice}
支撑:          ${support}
压力:          ${resistance}
中轴:          ${pivot}
昨日收盘价：${result[0].closePrice}
`
      e.reply(formatMsg, true, { recallMsg: 0 }, true)
      return
    } catch ({ message }) {
      logger.error('error', message)
      e.reply(message, true, { recallMsg: 5 })
      return
    }
  }
}
