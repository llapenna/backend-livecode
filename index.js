const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
const port = 3000

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

// GET all chats
app.get('/chats', (req, res) => {
  res.json(data.chats)
})

// GET single chat by ID
app.get('/chats/:id', (req, res) => {
  const chat = data.chats.find(c => c.id === parseInt(req.params.id))
  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' })
  }
  res.json(chat)
})

// POST create new chat
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

// PUT update chat
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

// DELETE chat
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

// ============== MESSAGES CRUD ==============

// GET all messages (optionally filter by chat_id)
app.get('/messages', (req, res) => {
  const { chat_id } = req.query

  if (chat_id) {
    const filteredMessages = data.messages.filter(
      m => m.chat_id === parseInt(chat_id)
    )
    return res.json(filteredMessages)
  }

  res.json(data.messages)
})

// GET single message by ID
app.get('/messages/:id', (req, res) => {
  const message = data.messages.find(m => m.id === parseInt(req.params.id))
  if (!message) {
    return res.status(404).json({ error: 'Message not found' })
  }
  res.json(message)
})

// POST create new message
app.post('/messages', (req, res) => {
  const { chat_id, type, author, content } = req.body

  // Validation
  if (!chat_id || !type || !author || !content) {
    return res.status(400).json({
      error: 'chat_id, type, author, and content are required'
    })
  }

  // Check if chat exists
  const chatExists = data.chats.some(c => c.id === chat_id)
  if (!chatExists) {
    return res.status(404).json({ error: 'Chat not found' })
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
    chat_id,
    type,
    author,
    content
  }

  data.messages.push(newMessage)
  res.status(201).json(newMessage)
})

// PUT update message
app.put('/messages/:id', (req, res) => {
  const messageIndex = data.messages.findIndex(
    m => m.id === parseInt(req.params.id)
  )

  if (messageIndex === -1) {
    return res.status(404).json({ error: 'Message not found' })
  }

  const { chat_id, type, author, content } = req.body

  // Update only provided fields
  if (chat_id !== undefined) {
    const chatExists = data.chats.some(c => c.id === chat_id)
    if (!chatExists) {
      return res.status(404).json({ error: 'Chat not found' })
    }
    data.messages[messageIndex].chat_id = chat_id
  }

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

// DELETE message
app.delete('/messages/:id', (req, res) => {
  const messageIndex = data.messages.findIndex(
    m => m.id === parseInt(req.params.id)
  )

  if (messageIndex === -1) {
    return res.status(404).json({ error: 'Message not found' })
  }

  data.messages.splice(messageIndex, 1)
  res.status(204).send()
})

// ============== UTILITY ENDPOINTS ==============

// GET all data
app.get('/data', (req, res) => {
  res.json(data)
})

// POST reset data to default
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
        'GET /messages': 'Get all messages (optional ?chat_id=X)',
        'GET /messages/:id': 'Get message by ID',
        'POST /messages': 'Create new message',
        'PUT /messages/:id': 'Update message',
        'DELETE /messages/:id': 'Delete message'
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