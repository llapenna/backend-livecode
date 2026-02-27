const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const swaggerJsdoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const app = express()
const port = 3000

// Swagger configuration
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LiveCode Backend API',
      version: '1.0.0',
      description: 'REST API for managing chats and messages',
    },
    servers: [{ url: `http://localhost:${port}` }],
    components: {
      schemas: {
        Chat: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            index: { type: 'integer', example: 0 },
            name: { type: 'string', example: 'My Chat' },
            shared: { type: 'boolean', example: false },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            chat_id: { type: 'integer', example: 1 },
            type: { type: 'string', enum: ['user', 'thinking', 'answer'], example: 'user' },
            author: { type: 'string', example: 'John' },
            content: { type: 'object', example: { text: 'Hello' } },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [__filename],
})

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// CORS middleware - must be before other middleware
app.use(cors())

// Middleware to parse JSON
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  console.log('Content-Type:', req.headers['content-type'])
  console.log('Body:', req.body)
  next()
})

// Load initial data from default.json
let data = {
  chats: [],
  messages: []
}

function loadDefaultData() {
  try {
    const defaultData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'default.json'), 'utf-8')
    )
    data = { ...defaultData }
    console.log('Data loaded from default.json')
  } catch (error) {
    console.error('Error loading default.json:', error.message)
  }
}

// Load data on startup
loadDefaultData()

// Helper function to get next ID
function getNextId(array) {
  if (array.length === 0) return 1
  return Math.max(...array.map(item => item.id)) + 1
}

// ============== CHATS CRUD ==============

/**
 * @swagger
 * /chats:
 *   get:
 *     summary: Get all chats
 *     tags: [Chats]
 *     responses:
 *       200:
 *         description: List of all chats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 */
app.get('/chats', (req, res) => {
  res.json(data.chats)
})

/**
 * @swagger
 * /chats/{id}:
 *   get:
 *     summary: Get a chat by ID
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: The chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/chats/:id', (req, res) => {
  const chat = data.chats.find(c => c.id === parseInt(req.params.id))
  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' })
  }
  res.json(chat)
})

/**
 * @swagger
 * /chats:
 *   post:
 *     summary: Create a new chat
 *     tags: [Chats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My New Chat
 *               shared:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Chat created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Name is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/chats', (req, res) => {
  const { name, shared } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const newChat = {
    id: getNextId(data.chats),
    index: data.chats.length,
    name,
    shared: shared !== undefined ? shared : false
  }

  data.chats.push(newChat)
  res.status(201).json(newChat)
})

/**
 * @swagger
 * /chats/{id}:
 *   put:
 *     summary: Update a chat
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               index:
 *                 type: integer
 *               shared:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Updated chat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/chats/:id', (req, res) => {
  const chatIndex = data.chats.findIndex(c => c.id === parseInt(req.params.id))

  if (chatIndex === -1) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  console.log(req.body)

  const { name, index, shared } = req.body

  if (name !== undefined) {
    data.chats[chatIndex].name = name
  }

  if (index !== undefined) {
    data.chats[chatIndex].index = index
  }

  if (shared !== undefined) {
    data.chats[chatIndex].shared = shared
  }

  res.json(data.chats[chatIndex])
})

/**
 * @swagger
 * /chats/{id}:
 *   delete:
 *     summary: Delete a chat
 *     description: Deletes the chat and all its associated messages
 *     tags: [Chats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Chat deleted
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/chats/:id', (req, res) => {
  const chatId = parseInt(req.params.id)
  const chatIndex = data.chats.findIndex(c => c.id === chatId)

  if (chatIndex === -1) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  // Also delete all messages associated with this chat
  data.messages = data.messages.filter(m => m.chat_id !== chatId)

  data.chats.splice(chatIndex, 1)
  res.status(204).send()
})

// ============== MESSAGES CRUD (nested under chats) ==============

/**
 * @swagger
 * /chats/{id}/messages:
 *   get:
 *     summary: Get all messages for a chat
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: List of messages for the chat
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/chats/:id/messages', (req, res) => {
  const chatId = parseInt(req.params.id)
  const chatExists = data.chats.some(c => c.id === chatId)
  if (!chatExists) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  const messages = data.messages.filter(m => m.chat_id === chatId)
  res.json(messages)
})

/**
 * @swagger
 * /chats/{id}/messages/{messageId}:
 *   get:
 *     summary: Get a single message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat ID
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       200:
 *         description: The message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       404:
 *         description: Chat or message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/chats/:id/messages/:messageId', (req, res) => {
  const chatId = parseInt(req.params.id)
  const messageId = parseInt(req.params.messageId)

  const chatExists = data.chats.some(c => c.id === chatId)
  if (!chatExists) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  const message = data.messages.find(m => m.id === messageId && m.chat_id === chatId)
  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }

  res.json(message)
})

/**
 * @swagger
 * /chats/{id}/messages:
 *   post:
 *     summary: Create a new message in a chat
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, author, content]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [user, thinking, answer]
 *                 example: user
 *               author:
 *                 type: string
 *                 example: John
 *               content:
 *                 type: object
 *                 example: { "text": "Hello world" }
 *     responses:
 *       201:
 *         description: Message created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chat not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/chats/:id/messages', (req, res) => {
  const chatId = parseInt(req.params.id)
  const { type, author, content } = req.body

  // Check if chat exists
  const chatExists = data.chats.some(c => c.id === chatId)
  if (!chatExists) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  // Validation
  if (!type || !author || !content) {
    return res.status(400).json({
      error: 'type, author, and content are required'
    })
  }

  // Validate type
  const validTypes = ['user', 'thinking', 'answer']
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      error: `Type must be one of: ${validTypes.join(', ')}`
    })
  }

  const newMessage = {
    id: getNextId(data.messages),
    chat_id: chatId,
    type,
    author,
    content
  }

  data.messages.push(newMessage)
  res.status(201).json(newMessage)
})

/**
 * @swagger
 * /chats/{id}/messages/{messageId}:
 *   put:
 *     summary: Update a message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat ID
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [user, thinking, answer]
 *               author:
 *                 type: string
 *               content:
 *                 type: object
 *     responses:
 *       200:
 *         description: Updated message
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Chat or message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.put('/chats/:id/messages/:messageId', (req, res) => {
  const chatId = parseInt(req.params.id)
  const messageId = parseInt(req.params.messageId)

  const chatExists = data.chats.some(c => c.id === chatId)
  if (!chatExists) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  const messageIndex = data.messages.findIndex(
    m => m.id === messageId && m.chat_id === chatId
  )

  if (messageIndex === -1) {
    return res.status(404).json({ error: 'Message not found' })
  }

  const { type, author, content } = req.body

  if (type !== undefined) {
    const validTypes = ['user', 'thinking', 'answer']
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Type must be one of: ${validTypes.join(', ')}`
      })
    }
    data.messages[messageIndex].type = type
  }

  if (author !== undefined) {
    data.messages[messageIndex].author = author
  }

  if (content !== undefined) {
    data.messages[messageIndex].content = content
  }

  res.json(data.messages[messageIndex])
})

/**
 * @swagger
 * /chats/{id}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chat ID
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Message ID
 *     responses:
 *       204:
 *         description: Message deleted
 *       404:
 *         description: Chat or message not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.delete('/chats/:id/messages/:messageId', (req, res) => {
  const chatId = parseInt(req.params.id)
  const messageId = parseInt(req.params.messageId)

  const chatExists = data.chats.some(c => c.id === chatId)
  if (!chatExists) {
    return res.status(404).json({ error: 'Chat not found' })
  }

  const messageIndex = data.messages.findIndex(
    m => m.id === messageId && m.chat_id === chatId
  )

  if (messageIndex === -1) {
    return res.status(404).json({ error: 'Message not found' })
  }

  data.messages.splice(messageIndex, 1)
  res.status(204).send()
})

// ============== UTILITY ENDPOINTS ==============

/**
 * @swagger
 * /data:
 *   get:
 *     summary: Get all data (chats and messages)
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: All chats and messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 chats:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Chat'
 *                 messages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Message'
 */
app.get('/data', (req, res) => {
  res.json(data)
})

/**
 * @swagger
 * /reset:
 *   post:
 *     summary: Reset data to default
 *     description: Reloads all data from default.json, discarding any changes
 *     tags: [Utility]
 *     responses:
 *       200:
 *         description: Data reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 */
app.post('/reset', (req, res) => {
  loadDefaultData()
  res.json({ message: 'Data reset to default', data })
})

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'LiveCode Backend API',
    endpoints: {
      chats: {
        'GET /chats': 'Get all chats',
        'GET /chats/:id': 'Get chat by ID',
        'POST /chats': 'Create new chat',
        'PUT /chats/:id': 'Update chat',
        'DELETE /chats/:id': 'Delete chat'
      },
      messages: {
        'GET /chats/:id/messages': 'Get all messages for a chat',
        'GET /chats/:id/messages/:messageId': 'Get message by ID',
        'POST /chats/:id/messages': 'Create new message in a chat',
        'PUT /chats/:id/messages/:messageId': 'Update message',
        'DELETE /chats/:id/messages/:messageId': 'Delete message'
      },
      utility: {
        'GET /data': 'Get all data',
        'POST /reset': 'Reset data to default.json'
      }
    }
  })
})

app.listen(port, () => {
  console.log(`LiveCode Backend API listening on port ${port}`)
  console.log(`Visit http://localhost:${port} for endpoint documentation`)
})