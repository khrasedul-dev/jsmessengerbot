A **Telegraf-inspired framework** for building **Facebook Messenger bots** with modern **scene** and **session** management.

## Features

- Step-by-step **scene system** (Wizard-like)
- In-memory and file-based **session storage**
- **Middleware-based architecture**
- Simple API for **commands**, **actions**, and **media**
- Persistent sessions (optional)
- Clean, modern codebase

## Installation

```bash
npm install jsmessengerbot
```

## API
### Default webhook listen 
- `https://<your site>/webhook`

### MessengerBot

- `command(cmd, fn)` — Register a command handler. Only the first matching handler will run for each event.
- `action(payload, fn)` — Register a button/action handler
- `use(middleware)` — Add middleware
- `start(port)` — Start the bot server

### Scene System

- `Scene(name, steps[])` — Create a scene
- `SceneManager()` — Manage and register scenes
- `scenes.register(scene)` — Register a scene
- `scenes.middleware()` — Scene middleware
- `scenes.enter('sceneName')` — Enter a scene

### Session Middleware

- `session({ type: 'file' })` — Use file-based session (default is in-memory)

### Markup (Buttons, Keyboards, Media)

Import Markup:

```js
import { Markup } from 'jsmessengerbot'
```

#### Quick Replies (Keyboard)

```js
await ctx.reply(
  'Choose an option:',
  Markup.keyboard([[Markup.button('Yes', 'YES'), Markup.button('No', 'NO')]])
)
```

### Handle quick reply actions ONLY if from button:

```js
bot.hears(/yes/i, async (ctx) => {
  if (ctx.event.message?.quick_reply) {
    await ctx.reply('You clicked Button Yes')
  }
})
bot.hears(/no/i, async (ctx) => {
  if (ctx.event.message?.quick_reply) {
    await ctx.reply('You clicked Button No')
  }
})
```

#### Multiple Command Patterns

You can match multiple commands with an array or regex:

```js
bot.command(['/start', '/help', /\/test/i], async (ctx) => {
  await ctx.reply('You triggered a multi-command handler!')
})
```

### Global Error Handler

Add a global error handler for all middleware and handlers:

```js
bot.catch((err, ctx, next) => {
  console.error('Global error:', err)
  // Optionally reply to user or handle error
})
```

#### Inline Buttons (Postback & URL)

```js
await ctx.reply(
  'Click a button:',
  Markup.inlineKeyboard([
    Markup.button('Button 1', 'BTN_1'),
    Markup.button('Button 2', 'BTN_2'),
    Markup.urlButton('Visit Google', 'https://google.com'),
  ])
)
```

#### Media Replies

```js
await ctx.replyWithPhoto('https://example.com/photo.jpg')
await ctx.replyWithDocument('https://example.com/file.pdf')
await ctx.replyWithAudio('https://example.com/audio.mp3')
await ctx.replyWithVideo('https://example.com/video.mp4')
```

#### Handling Actions

```js
bot.action('BTN_1', async (ctx) => {
  await ctx.reply('You clicked Inline Button 1 ✅')
  await ctx.replyWithPhoto('https://www.w3schools.com/w3images/lights.jpg')
})
bot.action('BTN_2', async (ctx) => {
  await ctx.reply('You clicked Inline Button 2 ✅')
  await ctx.replyWithDocument(
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
  )
})
```

## Example: Registration Scene

```js
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

// Use in-memory session (default)
bot.use(session())
// Or file-based session
// bot.use(session({ type: 'file' }))

bot.use(scenes.middleware())
bot.command('/start', async (ctx) => {
  await ctx.reply('Welcome! Type /registration to begin.')
})
bot.command('/registration', scenes.enter('registration'))
```

## Event System

Handle all incoming messages and postback events:

```js
bot.on('message', async (ctx) => {
  // Runs for every incoming message
  console.log('Received message:', ctx.text)
})

bot.on('postback', async (ctx) => {
  // Runs for every postback event
  console.log('Received postback:', ctx.event.postback?.payload)
})
```

## Example: Simple Bot

```js
import 'dotenv/config'
import MessengerBot, {
  Markup,
  session,
  Scene,
  SceneManager,
} from 'jsmessengerbot'

const bot = new MessengerBot({
  accessToken: process.env.PAGE_ACCESS_TOKEN,
  verifyToken: process.env.VERIFY_TOKEN,
  appSecret: process.env.APP_SECRET,
  apiVersion: 'v23.0',
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
    await ctx.reply('You clicked Button Yes')
  }
})
bot.hears(/no/i, async (ctx) => {
  if (ctx.event.message?.quick_reply) {
    await ctx.reply('You clicked Button No')
  }
})

bot.start(3000)
```

## Custom Express Hosting

You can host MessengerJS with your own Express app :

```js
import express from 'express'
import MessengerBot from 'jsmessengerbot'

const bot = new MessengerBot({
  /* ...config... */
})

const app = express()
app.use(express.json())

// Mount Messenger webhook route
app.use('/webhook', bot.app)

// Start your own server
app.listen(3000, () => {
  console.log('Custom Express server running on port 3000')
})
```

Do not use `bot.start()` if you want full control over your Express server.

## License

MIT

## Author

KH Rasedul — [rasedul.dev@gmail.com](mailto:rasedul.dev@gmail.com)
