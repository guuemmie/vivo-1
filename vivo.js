const _ = require('lodash')
const axios = require('axios')
const colors = require('colors')

const mns = process.env.MNS || ''
const masterNodes = [...mns.split(',')]
console.log('MNS:', masterNodes)
const avgBlockTime = 2 // 2mins

const summaryUrl = 'http://vivo.explorerz.top:3003/ext/summary'
const masterNodeUrl = `http://vivo.explorerz.top:3003/ext/masternodes?_=${Date.now()}`

const numberWithCommas = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

function getDayAppend(day) {
  let dayAppend = 'th'
  if (day.endsWith(1)) {
    dayAppend = 'st'
  } else if (day.endsWith(2)) {
    dayAppend = 'nd'
  } else if (day.endsWith(3)) {
    dayAppend = 'rd'
  }
  return dayAppend
}

function runRequest() {
  axios.get(summaryUrl)
  .then(sum => {
    const summary = sum.data.data
    const {
      blockcount,
      cmc,
      lastPriceUsd,
      lastPriceBtc,
      masternodeCount,
      masternodeOnlineCount,
    } = summary['0']
    const {
      rank,
      percent_change_24h,
    } = cmc
    const REWARD = 5
    console.log(colors.inverse(`
      Height: ${numberWithCommas(blockcount)}
      1 VIVO: $${Number(lastPriceUsd).toFixed(2)}
      Reward: $${(Number(lastPriceUsd) * REWARD).toFixed(2)}
      ${lastPriceBtc} VIVO / BTC
      Rank: ${rank}
      ${percent_change_24h}% 24hr`))
    axios.get(masterNodeUrl)
    .then(data => { // TODO async
      const nodes = data.data.data
      const activeNodes = _.filter(nodes, { 'status': 'ENABLED' })
      console.log(colors.blue(`Active Nodes: ${masternodeOnlineCount} of Total: ${masternodeCount}`))
      const sortedActiveNodes = _.sortBy(activeNodes, [(o) => Number(o.lastpaid)])
      // console.log(sortedActiveNodes)
      masterNodes.forEach((node) => { // TODO sep func
        const myNode = _.filter(nodes, { 'ip': node })[0] || 'not found'
        console.log('My Node:', myNode)
        const myNodeIndex = _.indexOf(sortedActiveNodes, myNode)
        if (myNode.status !== 'ENABLED') {
          console.log(colors.red('MY MASTERNODE IS DOWN!'))
        } else {
          const neverPaid = _.filter(sortedActiveNodes, { 'lastpaid': '0' }).length
          console.log(colors.green(`Reward queue: ${masternodeOnlineCount - myNodeIndex}* of (${masternodeOnlineCount - neverPaid}**)${masternodeOnlineCount}`),
          `
          *higher = sooner reward
          **excludes neverpaid - new MNs`)
          const lowerBound = avgBlockTime * (myNodeIndex - neverPaid)
          const upperBound = avgBlockTime * myNodeIndex
          const centerPoint = (lowerBound + upperBound) / 2
          const centerPointMs = centerPoint * 60000
          const estTime = new Date(Date.now() + centerPointMs)
          const dayAppend = getDayAppend(estTime.getDate().toString())
          const dateString = `${estTime.getHours()}:${estTime.getMinutes()} on the ${estTime.getDate()}${dayAppend}`
          console.log(`Payout in ~${lowerBound} - ${upperBound} mins (${(lowerBound / 60).toFixed(2)} - ${(upperBound / 60).toFixed(2)} hrs)`)
          console.log(colors.green(`Est. around: ${dateString}`))
        }
      })
    })
    .catch(err => console.log(err))
  })
  .catch(err => console.log(err))
  setTimeout(() => {
    runRequest()
  }, 120000)
}

runRequest()
