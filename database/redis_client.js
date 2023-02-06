const { createClient } = require('redis')
const { redBright } = require('chalk')
const { REDIS_EVENT } = require('../utils/constants')
require('dotenv').config()

const redisClient = createClient({ url: process.env.REDIS_SERVER_URL })
// const redisClient = createClient()

// redis event handler
redisClient.on(REDIS_EVENT.ERROR, (e) => console.log(redBright.bold(`ERROR connecting to Redis ${e}`)))

module.exports.redisClient = redisClient