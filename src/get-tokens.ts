import { getEnv, loadEnv } from './config'
loadEnv()

import express from 'express'
import session from 'express-session'
import passport from 'passport'
import { Strategy as TwitterStrategy } from 'passport-twitter'
import { joinURL } from 'ufo'
import chalk from 'chalk'

const app = express()
const url = `http://${getEnv('HOST')}:${getEnv('PORT')}`
const callbackUrl = joinURL(url, '/auth/twitter/callback')
const tokens = {
  token: '',
  tokenSecret: '',
}

app.use(
  session({
    secret: getEnv('SESSION_SECRET'),
    resave: true,
    saveUninitialized: true,
  })
)
app.use(passport.initialize())

passport.serializeUser((user, done) => {
  done(null, user)
})

app.get('/', passport.authenticate('twitter'))

app.get('/ping', (_, res) => res.send())

app.get(
  '/auth/twitter/callback',
  passport.authenticate('twitter'),
  function (req, res) {
    setTimeout(() => process.exit(0), 1000)
    res.send(
      `<!DOCTYPE html><html><head><style>html, body{font-family: monospace; color: #202020; background: #f0f0f0; padding: 0; margin: 0;}*{box-sizing: border-box;}.title{color: #2b00ff; font-size: 1.4rem; margin: 0; margin-bottom: 24px;}.container{display: flex; justify-content: center; align-items: center; min-height: 100vh;}.content{background: white; max-width: 600px; width: 100%; padding: 24px; border-radius: 8px;}.value{width: 100%; display: block; color: #1b0387; font-size: 0.9rem; background: #ece8ff; margin: 8px 0; padding: 0.8rem; outline: none; border: none; border-radius: 8px; resize: none;}</style></head><body><div class="container"> <div class="content"> <h2 class="title">{username}'s twitter tokens</h2><div class="item"><textarea class="value" onclick="this.select(0,this.value.length)" value="{token}" rows="7" readonly>||
Token:
{token}

Token secret:
{tokenSecret}
||</textarea></div></div></div></body></html>`
        .replaceAll('{username}', (req.user as { username: string }).username)
        .replaceAll('{token}', tokens.token)
        .replaceAll('{tokenSecret}', tokens.tokenSecret)
    )
  }
)

passport.use(
  new TwitterStrategy(
    {
      consumerKey: getEnv('API_KEY'),
      consumerSecret: getEnv('API_SECRET'),
      callbackURL: callbackUrl,
    },
    (token, tokenSecret, profile, done) => {
      tokens.token = token
      tokens.tokenSecret = tokenSecret

      done(null, profile)
    }
  )
)

app.listen(getEnv('PORT'), () => {
  console.log(
    chalk.bold
      .green`1. add this url to callback urls in the Twitter Developer Portal.`
  )
  console.log('   ' + chalk.underline.blue(callbackUrl))

  console.log(chalk.bold.green`2. open this url in your browser:`)
  console.log('   ' + chalk.underline.blue(url))

  console.log(chalk.bold.green`3. login with twitter.`)

  console.log(chalk.bold.green`4. copy tokens and send to server manager.`)

  console.log(chalk.bold.red`5. close browser tab.`)
})
