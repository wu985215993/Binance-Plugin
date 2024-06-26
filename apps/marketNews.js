import plugin from '../../../lib/plugins/plugin.js'
import _ from 'lodash'
import chalk from 'chalk'
import request from '../utils/request.js'
import schedule from 'node-schedule'
import common from '../../../lib/common/common.js'

const MESSAGE_TITLE = 'Web3快讯'
const MAX_NEWS_COUNT = 5 // 最大新闻数量
const REDIS_SET_NAME = 'binance' // 插件存放 redis 目录
const REDIS_SET_GROUP_IDS = 'subscribeGroupIds' // 存储群聊id
const REDIS_SET_NEWS_IDS = 'web3NewsIds' // 存储讯息id
// odaily.news rest接口
const url = 'https://www.odaily.news/v1/openapi/feeds'
// 定时任务时间 设置为每2分钟都执行
const time = '*/2 * * * * *'

// 定时任务 启动
// autoTask()
export class MarketNews extends plugin {
  constructor () {
    super({
      name: 'web3快讯',
      event: 'message',
      priority: 500,
      rule: [
        {
          reg: /^#web3快讯$/,
          fnc: 'dailyNews'
        },
        {
          reg: /^#web3讯息订阅$/,
          fnc: 'subscribeNews'
        },
        {
          reg: /^#web3讯息订阅群号查询$/,
          fnc: 'findSubscribeGroupIds'
        }
      ]
    })
  }

  async dailyNews (e) {
    logger.info(
      chalk.rgb(133, 245, 103)(`- ～～～ web3快讯查询中 ～～～ ${e.msg}`)
    )
    e.reply('～～～ web3快讯查询中 ～～～', true, { recallMsg: 5 })

    const MESSAGE = [MESSAGE_TITLE]

    try {
      const { data } = await request(url)
      const arr_news = data.arr_news || []
      const newsCount = Math.min(arr_news.length, MAX_NEWS_COUNT) // 取数组长度和10的最小值

      for (let i = 0; i < newsCount; i++) {
        const newsItem = arr_news[i]
        let newsMessage = []
        newsMessage.push('\n序号：' + (i + 1))
        newsMessage.push('发布时间：' + newsItem.published_at)
        newsMessage.push('标题：' + newsItem.title)
        if (newsItem.summary) {
          newsMessage.push('简介：' + newsItem.summary)
        }
        if (newsItem.description) {
          newsMessage.push('描述：' + newsItem.description)
        }

        if (newsItem.link) {
          newsMessage.push('链接：' + newsItem.link)
        }
        if (newsItem.news_url) {
          newsMessage.push('原文：' + newsItem.news_url)
        }
        MESSAGE.push(newsMessage.join('\n\n'))
      }
      e.reply(MESSAGE, false)
      // e.reply()
      return true
    } catch ({ message }) {
      logger.error('error', message)
      e.reply(message, true, { recallMsg: 5 })
      return true
    }
  }

  /**
   * @function 获取新闻列表并进行推送
   *  TODO
   *  1、支持私聊订阅
   *  2、支持群聊订阅
   *  3、支持定时任务
   *  4、后期通过 yaml编辑订阅的qq id和群聊 id 目前通过redis存储
   */
  async subscribeNews (e) {
    try {
      logger.info(
        chalk.rgb(133, 245, 103)('- 订阅web3讯息 ～～～')
      )
      if (e.isPrivate) {
        e.reply('目前只支持群订阅哦~~~', true, { recallMsg: 10 })
        return true
      }
      /**
      * 通过 redis 存入群聊 id
      */
      const gruopIdsCache = await redis.get(
      `${REDIS_SET_NAME}:${REDIS_SET_GROUP_IDS}`
      ) || '[]'
      const preGroupIds = JSON.parse(gruopIdsCache)
      if (preGroupIds.includes(e.group_id)) {
        e.reply('当前群已经哦~~~ 不能重复订阅', true, { recallMsg: 10 })
        return true
      }
      const uniqueIds = _.uniq([...preGroupIds, e.group_id])
      redis.set(`${REDIS_SET_NAME}:${REDIS_SET_GROUP_IDS}`, JSON.stringify(uniqueIds))
      e.reply('web3讯息订阅成功 ~~~~', true, { recallMsg: 0 })
      return true
    } catch ({ message }) {
      logger.error('error', message)
      e.reply(message, true, { recallMsg: 5 })
      return true
    }
  }

  /**
   * @function 查询订阅的群聊id
   */
  async findSubscribeGroupIds (e) {
    try {
      const gruopIdsCache = await redis.get(
      `${REDIS_SET_NAME}:${REDIS_SET_GROUP_IDS}`
      ) || '[]'
      e.reply('目前订阅群有' + gruopIdsCache, true, { recallMsg: 5 })
      return true
    } catch ({ message }) {
      logger.error('查询订阅的群聊 失败', message)
      e.reply('查询订阅的群聊 失败' + message, true, { recallMsg: 5 })
      return true
    }
  }
}

/**
 * 推送讯息
 * @param e oicq传递的事件参数e
 * TODO 需要使用RSS进行推送 rest接口没有 0点到8点的推送
 */
async function pushNews (e) {
  // e.msg 用户的命令消息
  if (e.msg) {
    logger.info('[用户命令]', e.msg)
  }
  const { data } = await request(url).catch(err => logger.error(err))
  // 判断接口是否请求成功
  if (!data) {
    logger.error('[每日新闻] 接口请求失败：' + e.group_id)
  }
  // 获取前10条新闻
  const arr_news = data.arr_news || []
  const arr_newsIds = arr_news.map(item => item.id)
  // redis 存储 所有的新闻 id 过期时间 1天
  redis.set(`${REDIS_SET_NAME}:${REDIS_SET_NEWS_IDS}`, JSON.stringify(arr_newsIds), 'EX', 86400)
  const newsIdCache = await redis.get(
    `${REDIS_SET_NAME}:${REDIS_SET_GROUP_IDS}`
  ) || '[]'
  const preNewsIds = JSON.parse(newsIdCache)
  const uniqueIds = _.uniq([...preNewsIds, ...arr_news.map(item => item.id)])
  e.sendMsg(segment.image(res))
}

/**
 * 定时任务
 */
function autoTask () {
  schedule.scheduleJob(time, async () => {
    logger.info('[web3快讯]：开始自动推送...')
    const gruopIdsCache = await redis.get(
        `${REDIS_SET_NAME}:${REDIS_SET_GROUP_IDS}`
    ) || '[]'
    const preGroupIds = JSON.parse(gruopIdsCache)
    for (let i = 0; i < preGroupIds.length; i++) {
      let group = Bot.pickGroup(preGroupIds[i])
      pushNews(group, 1)
      await common.sleep(1000)
    }
  })
}
