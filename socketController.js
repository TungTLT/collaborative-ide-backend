const { SOCKET_IO_EVENT } = require('./utils/constants')
const { blueBright, redBright } = require('chalk');
const { PLClient } = require('./database/programming_language_client');

const USER_COLORS = [
    "#355FFA",
    "#0ac285",
    "#F85212",
    "#bf4545",
    "#e599a6",
    "#a28144",
    "#e08300",
    "#A545EE",
    "#6565cd",
    '#669999',
];
const USER_DEFAULT_COLOR = "#808080";

module.exports = (io, redisClient) => {
    io.on(SOCKET_IO_EVENT.CONNECTION, (socket) => {

        socket.on('CONNECTED_TO_ROOM_MEDIA', async ({ roomId }) => {
            // get current connected to room users
            const users = await redisClient.lRange(`${roomId}:users`, 0, -1)
                .catch((err) => {
                    console.error(redBright.bold(`get users with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t get information of users in roon', userId)
                    return
                })

            const userInRoom = await Promise.all(users.filter(id => id !== socket.id).map(async (id, index) => {
                userIn4 = await redisClient.hGetAll(`${id}:userInfo`)
                    .catch((err) => {
                        console.error(redBright.bold(`get users with ${err}`))
                        // TODO: handle error
                        return
                    })

                if (userIn4 != null) {
                    return {
                        'id': id,
                        'camState': userIn4.camState === 'true' ? true : false,
                        'micState': userIn4.micState === 'true' ? true : false,
                    }
                }
            }))

            socket.emit('ALL_USERS', userInRoom)
        })

        socket.on('SIGNAL_SENT', ({ userToSignal, callerID, signal }) => {
            io.to(userToSignal).emit('ROOM:CONNECTION_MEDIA', { signal, callerID })
        })

        socket.on('SIGNAL_RETURN', ({ signal, callerID }) => {
            io.to(callerID).emit('RECEIVE_RETURN_SIGNAL', { signal, id: socket.id })
        })

        socket.on(SOCKET_IO_EVENT.CODE_INSERT, async ({ roomId, data }) => {
            console.log('event code insert')
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.CODE_INSERT, data);
        })

        socket.on(SOCKET_IO_EVENT.CODE_REPLACE, async ({ roomId, data }) => {
            console.log('event code replace')
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.CODE_REPLACE, data);
        })

        socket.on(SOCKET_IO_EVENT.CODE_DELETE, async ({ roomId, data }) => {
            console.log('event code delete')
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.CODE_DELETE, data);
        })

        socket.on(SOCKET_IO_EVENT.OUTPUT_CHANGED, async ({ roomId, output }) => {
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.OUTPUT_CHANGED, output);
        })

        socket.on(SOCKET_IO_EVENT.CURSOR_CHANGED, async ({ roomId, cursorData }) => {
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.CURSOR_CHANGED, cursorData);
        })

        socket.on(SOCKET_IO_EVENT.SELECTION_CHANGED, async ({ roomId, selectionData }) => {
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.SELECTION_CHANGED, selectionData);
        })

        socket.on(SOCKET_IO_EVENT.CODE_CHANGED, async (code) => {
            const userId = socket.id
            const user_info = await redisClient.hGetAll(`${userId}:userInfo`)
                .catch((err) => {
                    console.error(redBright.bold(`get user info with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t get user information', socket.id)
                    return
                })
            const roomId = user_info['roomId']
            const roomName = `ROOM:${roomId}`
            socket.to(roomName).emit(SOCKET_IO_EVENT.CODE_CHANGED, code)
        })

        socket.on('DISSCONNECT_FROM_ROOM', async ({ roomId, username }) => console.log(blueBright.bold(`${username} disconnect from room ${roomId}`)))

        socket.on(SOCKET_IO_EVENT.CONNECTED_TO_ROOM, async ({ roomId, username }) => {
            const userId = socket.id
            // create user info
            await redisClient.hSet(`${userId}:userInfo`, {
                "username": username,
                "roomId": roomId,
                "micState": "true",
                "camState": "true"
            }).catch((err) => {
                console.error(redBright.bold(`create user info with ${err}`))
                // TODO: handle error
                handleError('Can\'t create new user information', userId)
                return
            })

            // add user to room
            await redisClient.lPush(`${roomId}:users`, `${userId}`)
                .catch((err) => {
                    console.error(redBright.bold(`add user to room with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t add user to room', userId)
                    return
                })

            // get current connected to room users
            const users = await redisClient.lRange(`${roomId}:users`, 0, -1)
                .catch((err) => {
                    console.error(redBright.bold(`get users with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t get information of users in roon', userId)
                    return
                })

            // get user info (id, username) by ids
            const userIds = users.map((ids) => `${ids}:userInfo`)

            const userInfors = await Promise.all(userIds.map(async (id, index) => {
                userIn4 = await redisClient.hGetAll(id)
                    .catch((err) => {
                        console.error(redBright.bold(`get users with ${err}`))
                        // TODO: handle error
                        return
                    })

                if (userIn4 != null) {
                    userIn4['id'] = users[index]
                    return userIn4
                }
            }))

            // user colors
            const userToColor = await redisClient.hGetAll(`${roomId}:userColors`)
                .catch((err) => {
                    console.error(redBright.bold(`get userColors map error: ${err}`))
                    // TODO: handle error
                    handleError('Can\'t get userColors map', userId)
                    return
                }) ?? {}

            userToColor[`${userId}`] = getUserColor(userToColor)

            await redisClient.hSet(`${roomId}:userColors`, userToColor)
                .catch((err) => {
                    console.error(redBright.bold(`save userColors error: ${err}`))
                    // TODO: handle error
                    handleError('Can\'t save userColors', userId)
                    return
                })

            const roomName = `ROOM:${roomId}`
            socket.join(roomName)
            io.in(roomName).emit(SOCKET_IO_EVENT.ROOM_CONNECTION, {
                'users': userInfors,
                'newUserId': socket.id,
                'userColors': userToColor
            })

            const roomInfo = await redisClient.hGetAll(`${roomId}:roomInfo`)
                .catch((err) => {
                    console.error(redBright.bold(`get code of room with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t get room information', userId)
                    return
                })

            // get current code of roomName
            const code = roomInfo.code

            console.log(roomInfo)
            if (users.length > 1) {
                console.log('emit to new user')
                // emit event CODE_CHANGED to just connect user
                if (code.length !== 0)
                    io.to(userId).emit(SOCKET_IO_EVENT.CODE_CHANGED, code)

                // get room programming language
                io.to(userId).emit(SOCKET_IO_EVENT.CHANGE_LANGUAGE, roomInfo.language)

                // get room language version index
                io.to(userId).emit(SOCKET_IO_EVENT.CHANGE_VERSION, roomInfo.versionIndex)
            }

            // get current message chat of roomName
            var roomMessages = await redisClient.lRange(`${roomId}:messages`, 0, -1)
                .catch((err) => {
                    console.error(redBright.bold(`get messages with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t get messages', userId)
                    return
                })

            roomMessages = roomMessages.map((mes, index) => {
                return JSON.parse(mes)
            })

            // emit event CHAT_MESSAGE to just connect user
            if (roomMessages.length !== 0)
                io.to(userId).emit('LOAD_ROOM_MESSAGES', roomMessages)
        })

        socket.on(SOCKET_IO_EVENT.DISCONNECT, async () => {
            const userId = socket.id

            // get disconnecting user info
            const userInfo = await redisClient.hGetAll(`${userId}:userInfo`).catch((err) => {
                console.error(redBright.bold(`get disconnect user with ${err}`))
                // TODO: handle error
                handleError('Can\'t get user information', userId)
                return
            })
            const roomId = userInfo['roomId']

            // delete user info
            await redisClient.del(`${userId}:userInfo`).catch((err) => {
                console.error(redBright.bold(`delete user info with ${err}`))
                // TODO: handle error
                handleError('Can\'t delete user', userId)
                return
            })

            // remove user from room
            await redisClient.lRem(`${roomId}:users`, 0, userId).catch((err) => {
                console.error(redBright.bold(`remove user from room with ${err}`))
                // TODO: handle error
                handleError('Can\'t remove user from room', userId)
                return
            })

            const remainUsers = await redisClient.lRange(`${roomId}:users`, 0, -1).catch((err) => {
                console.error(redBright.bold(`get remain users with ${err}`))
                // TODO: handle error
                handleError('Can\'t get information of user in room', userId)
                return
            })

            if (remainUsers.length != 0) {
                const roomName = `ROOM:${roomId}`
                io.in(roomName).emit('ROOM:DISCONNECTION_MEDIA', socket.id)
                io.in(roomName).emit(SOCKET_IO_EVENT.ROOM_DISCONNECT, socket.id)

                // remove user color
                await redisClient.hDel(`${roomId}:userColors`, userId)
                    .catch((err) => {
                        console.error(redBright.bold(`remove userColor error: ${err}`))
                        // TODO: handle error
                        handleError('Can\'t remove userColor', userId)
                        return
                    })
            }
            else {
                // delete user list in a room
                await redisClient.del(`${roomId}:users`).catch((err) => {
                    console.error(redBright.bold(`delete user list in room with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t delete room\s user list', userId)
                    return
                })

                // delete room info
                await redisClient.del(`${roomId}:roomInfo`).catch((err) => {
                    console.error(redBright.bold(`delete roomInfo with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t delete room', userId)
                    return
                })

                // delete message list
                await redisClient.del(`${roomId}:messages`).catch((err) => {
                    console.error(redBright.bold(`delete message list in room with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t delete room message list', userId)
                    return
                })
                // delete userColors
                await redisClient.del(`${roomId}:userColors`).catch((err) => {
                    console.error(redBright.bold(`delete userColors error ${err}`))
                    // TODO: handle error
                    handleError('Can\'t delete userColors', userId)
                    return
                })
            }
        })

        socket.on(SOCKET_IO_EVENT.CHANGE_LANGUAGE, async (params) => {
            const roomId = params['roomId']
            const newLanguage = params['newLanguage']
            const roomName = `ROOM:${roomId}`

            await redisClient.hSet(`${roomId}:roomInfo`, {
                'language': newLanguage, 'versionIndex': "0"
            }).catch((err) => {
                console.error(redBright.bold(` set room info error ${err}`))
                // TODO: handle error
                handleError('Can\'t set room info', userId)
                return
            })

            const templateForNewLang = new PLClient().findLanguage(newLanguage).template

            await redisClient.hSet(`${roomId}:roomInfo`, 'code', templateForNewLang)
                .catch((err) => {
                    console.error(redBright.bold(` set code of room error ${err}`))
                    // TODO: handle error
                    handleError('Can\'t set code of room', userId)
                    return
                })

            socket.in(roomName).emit(SOCKET_IO_EVENT.CODE_CHANGED, templateForNewLang)

            socket.in(roomName).emit(SOCKET_IO_EVENT.CHANGE_LANGUAGE, newLanguage)
        })

        socket.on(SOCKET_IO_EVENT.CHANGE_VERSION, async (params) => {
            const roomId = params['roomId']
            const newVersionIndex = params['newVersionIndex']
            const roomName = `ROOM:${roomId}`

            await redisClient.hSet(`${roomId}:roomInfo`, 'versionIndex', newVersionIndex)
                .catch((err) => {
                    console.error(redBright.bold(`set room info error ${err}`))
                    // TODO: handle error
                    handleError('Can\'t set room info', userId)
                    return
                })

            socket.in(roomName).emit(SOCKET_IO_EVENT.CHANGE_VERSION, newVersionIndex)

        })

        socket.on(SOCKET_IO_EVENT.COMPILE_STATE_CHANGED, ({ roomId, state }) => {
            const roomName = `ROOM:${roomId}`
            socket.in(roomName).emit(SOCKET_IO_EVENT.COMPILE_STATE_CHANGED, state)
        })

        socket.on('TOGGLE_MICROPHONE', async ({ userId, roomId, micState }) => {
            const roomName = `ROOM:${roomId}`
            const micValue = micState ? 'true' : 'false'
            await redisClient.hSet(`${userId}:userInfo`, 'micState', micValue)
            socket.in(roomName).emit('SOMEONE_TOGGLE_MICROPHONE', {
                userId, micState
            })
        })

        socket.on('TOGGLE_CAMERA', async ({ userId, roomId, camState }) => {
            const roomName = `ROOM:${roomId}`
            const camValue = camState ? 'true' : 'false'
            await redisClient.hSet(`${userId}:userInfo`, 'camState', camValue)
            socket.in(roomName).emit('SOMEONE_TOGGLE_CAMERA', {
                userId, camState
            })
        })

        socket.on('CHAT_MESSAGE', async ({ username, roomId, message }) => {
            // Map object to string
            var messageEntity = `{"username": "${username}", "message": "${message}"}`
            // save into redis
            await redisClient.rPush(`${roomId}:messages`, messageEntity)
                .catch((err) => {
                    console.error(redBright.bold(`save chat messages with ${err}`))
                    // TODO: handle error
                    handleError('Can\'t save chat messages', userId)
                    return
                })

            const roomName = `ROOM:${roomId}`
            socket.in(roomName).emit('CHAT_MESSAGE', { 'senderName': username, message })
        })

        socket.on('LISTEN_TO_SPEAKER', ({ roomId, isSpeaking }) => {
            const roomName = `ROOM:${roomId}`
            socket.in(roomName).emit('LISTEN_TO_SPEAKER', { 'userId': socket.id, isSpeaking })
        })

    })

    const handleError = (message, socketId) => {
        io.to(socketId).emit(SOCKET_IO_EVENT.DB_ERROR, message)
    }

    function getUserColor(rUserToColor) {
        const userToColor = new Map(Object.entries(rUserToColor))

        var value = USER_DEFAULT_COLOR;
        USER_COLORS.forEach(e => {
            const values = Array.from(userToColor.values() ?? {})

            if (!values.includes(e)) {
                value = e
            }
        })
        return value;
    }
}