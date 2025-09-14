import 'dotenv/config'
import MessengerBot, { Markup, Scene, SceneManager, session } from '../index.js'

const bot = new MessengerBot({
  accessToken: process.env.PAGE_ACCESS_TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  appSecret: process.env.APP_SECRET,
  apiVersion: 'v23.0',
})

// Global error handler example
bot.catch((err, ctx, next) => {
  console.error('Global error:', err)
  // Optionally reply to user or handle error
})

// Registration scene
const registrationScene = new Scene('registration', [
  async (ctx) => {
    await ctx.reply('Welcome to the registration! What is your first name?')
  },
  async (ctx) => {
    if (!ctx.text) {
      await ctx.reply('Please enter your first name.')
      return false
    }
    ctx.session.firstName = ctx.text
    await ctx.reply('What is your last name?')
  },
  async (ctx) => {
    if (!ctx.text) {
      await ctx.reply('Please enter your last name.')
      return false
    }
    ctx.session.lastName = ctx.text
    await ctx.reply('What is your email address?')
  },
  async (ctx) => {
    if (!ctx.text || !/\S+@\S+\.\S+/.test(ctx.text)) {
      await ctx.reply('Please enter a valid email address.')
      return false
    }
    ctx.session.email = ctx.text
    await ctx.reply(
      `Registration complete!\nFirst Name: ${ctx.session.firstName}\nLast Name: ${ctx.session.lastName}\nEmail: ${ctx.session.email}`
    )
    await ctx.scene.leave(ctx)
  },
])

const scenes = new SceneManager()
scenes.register(registrationScene)

// Use file-based session store (sessions.json in project root)
// bot.use(session({ type: 'file' }))

// Use in-memory session store (default)
bot.use(session())

bot.use(scenes.middleware())

bot.command('/start', async (ctx) => {
  await ctx.reply('Welcome! Type /registration to begin.')
})
bot.command('/registration', scenes.enter('registration'))

bot.hears(['hello', 'hi', 'hey'], async (ctx) => {
  await ctx.reply('Hello! How can I assist you today?')
})

// Media URLs
const testPhotoUrl = 'https://www.w3schools.com/w3images/lights.jpg'
const testDocUrl =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
const testAudioUrl =
  'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
const testVideoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4'

bot.command('/photo', async (ctx) => {
  await ctx.reply('Here is a test photo!')
  await ctx.replyWithPhoto(testPhotoUrl)
})

bot.command('/document', async (ctx) => {
  await ctx.reply('Here is a test PDF!')
  await ctx.replyWithDocument(testDocUrl)
})

bot.command('/audio', async (ctx) => {
  await ctx.replyWithAudio(testAudioUrl)
})

bot.command('/video', async (ctx) => {
  await ctx.replyWithVideo(testVideoUrl)
})

bot.command('/keyboard', async (ctx) => {
  await ctx.reply(
    'Choose an option:',
    Markup.keyboard([[Markup.button('Yes', 'YES'), Markup.button('No', 'NO')]])
  )
})

bot.command('/inlineKeyboard', async (ctx) => {
  await ctx.reply(
    'Click a button:',
    Markup.inlineKeyboard([
      Markup.button('Button 1', 'BTN_1'),
      Markup.button('Button 2', 'BTN_2'),
      Markup.urlButton('Visit Google', 'https://google.com'),
    ])
  )
})

bot.action('BTN_1', async (ctx) => {
  await ctx.reply('You clicked Inline Button 1 ✅')
  await ctx.replyWithPhoto(testPhotoUrl)
})
bot.action('BTN_2', async (ctx) => {
  await ctx.reply('You clicked Inline Button 2 ✅')
  await ctx.replyWithDocument(testDocUrl)
})

// Handle quick reply actions for Messenger keyboard (case-insensitive, only if from button)
bot.hears(/yes/i, async (ctx) => {
  if (ctx.event.message?.quick_reply) {
    await ctx.reply('You clicked Button Yes ')
  }
})
bot.hears(/no/i, async (ctx) => {
  if (ctx.event.message?.quick_reply) {
    await ctx.reply('You clicked Button No')
  }
})
// Multiple command example
bot.command(['/start', '/help', /\/test/i], async (ctx) => {
  await ctx.reply('You triggered a multi-command handler!')
})

bot.on('message', async (ctx) => {
    await ctx.reply('Received message:', ctx.text)
})


bot.start(3000)
