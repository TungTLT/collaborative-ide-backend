var express = require('express');
var router = express.Router();
const { redisClient } = require('../database/redis_client')
const moment = require('moment')
const { greenBright, redBright } = require('chalk')
const { v4 } = require('uuid')
const { PLClient } = require('../database/programming_language_client')

const plClient = new PLClient()

/* GET home page. */
router.get('/', function (req, res, next) {
  res.end('CONNECTED')
});

/* POST create room with user */
router.post('/create-room-with-user', async (req, res) => {
  const roomId = v4()

  const defaultLanguage = new PLClient().findLanguage('Java')
  const defaultLanguageVersionIndex = new PLClient().findVersionIndex(defaultLanguage, defaultLanguage.versions[0].name)

  console.log(defaultLanguageVersionIndex)

  await redisClient.hSet(`${roomId}:roomInfo`, {
    "created": moment().toString(),
    "code": "",
    "language": defaultLanguage.name,
    "versionIndex": defaultLanguageVersionIndex,
  })
    .catch((err) => {
      console.log(redBright.bold(`create room info with ${err}`))
      res.status(500).send("Sorry! There are problems that we can't create room. Try again later")
      return
    })

  res.status(201).send({ roomId })
})

/* GET find room with id */
router.get('/find-room-with-id', async (req, res) => {
  const findRoomId = `${req.query['roomId']}:roomInfo`

  const findRoomResult = await redisClient.keys(findRoomId).catch((err) => {
    console.log(redBright.bold(`find room with ${err}`))
    res.status(404).send("Not found room")
    return
  })

  if (findRoomResult.length != 0) {
    console.log(greenBright.bold(`found rooms: ${findRoomResult}`))
    res.status(200).send({
      "foundRoomIds": req.query['roomId']
    })
  } else {
    console.log(redBright.bold(`Not found room`))
    res.status(404).send("Not found room")
  }
})

/* GET check duplicate name */
router.get('/check-if-username-exist', async (req, res) => {
  const username = req.query['username']
  const roomId = req.query['roomId']
  const userListKey = `${roomId}:users`

  console.log(username)

  const userIdInRoom = await redisClient.lRange(userListKey, 0, -1)
    .catch((err) => {
      console.log(redBright.bold(`find user in room with ${err}`))
      res.status(404).send("Not found user list in room")
      return
    })

  const usernameList = await Promise.all(userIdInRoom.map(async (id) => {
    return await redisClient.hGet(`${id}:userInfo`, 'username')
      .catch((err) => {
        console.log(redBright.bold(`find user info with ${err}`))
        res.status(404).send("There is some error!")
        return
      })
  }))

  if (!usernameList.includes(username)) {
    res.status(200).send({
      'isUsernameExist': false
    })
  } else {
    res.status(200).send({
      'isUsernameExist': true
    })
  }
})

module.exports = router;
