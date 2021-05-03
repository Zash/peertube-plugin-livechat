import type { Router, Request, Response, NextFunction } from 'express'
import { videoHasWebchat } from '../../../shared/lib/video'
import { asyncMiddleware } from '../middlewares/async'

// See here for description: https://modules.prosody.im/mod_muc_http_defaults.html
interface RoomDefaults {
  config: {
    name: string
    description: string
    language?: string
    persistent?: boolean
    public?: boolean
    members_only?: boolean
    allow_member_invites?: boolean
    public_jids?: boolean
    subject: string
    changesubject?: boolean
    // historylength: number
    moderated?: boolean
    archiving?: boolean
  }
  affiliations?: Array<{
    jid: string
    affiliation: 'outcast' | 'none' | 'member' | 'admin' | 'owner'
    nick?: string
  }>
}

async function initApiRouter (options: RegisterServerOptions): Promise<Router> {
  const { peertubeHelpers, getRouter } = options
  const router = getRouter()
  const logger = peertubeHelpers.logger

  router.get('/room', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
      const jid: string = req.query.jid as string || ''
      logger.info(`Requesting room information for room '${jid}'.`)

      const video = await peertubeHelpers.videos.loadByIdOrUUID(jid)
      if (!video) {
        logger.warn(`Video ${jid} not found`)
        res.sendStatus(403)
        return
      }
      // check settings (chat enabled for this video?)
      const settings = await options.settingsManager.getSettings([
        'chat-use-prosody',
        'chat-only-locals',
        'chat-all-lives',
        'chat-all-non-lives',
        'chat-videos-list'
      ])
      if (!settings['chat-use-prosody']) {
        logger.warn('Prosody chat is not active')
        res.sendStatus(403)
        return
      }
      if (!videoHasWebchat({
        'chat-only-locals': settings['chat-only-locals'] as boolean,
        'chat-all-lives': settings['chat-all-lives'] as boolean,
        'chat-all-non-lives': settings['chat-all-non-lives'] as boolean,
        'chat-videos-list': settings['chat-videos-list'] as string
      }, video)) {
        logger.warn(`Video ${jid} has not chat activated`)
        res.sendStatus(403)
        return
      }

      const roomDefaults: RoomDefaults = {
        config: {
          name: video.name,
          description: '',
          language: video.language,
          subject: video.name
        },
        affiliations: [] // so that the first user will not be moderator/admin
      }
      res.json(roomDefaults)
    }
  ))

  router.post('/user/register', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
      res.sendStatus(501)
    }
  ))

  router.get('/user/check_password', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
      const settings = await options.settingsManager.getSettings([
        'chat-use-prosody',
        'chat-only-locals',
        'chat-all-lives',
        'chat-all-non-lives',
        'chat-videos-list'
      ])
      if (!settings['chat-use-prosody']) {
        logger.warn('Prosody chat is not active')
        res.status(200).send('false')
        return
      }
      const user = req.query.user
      const server = req.query.server
      const pass = req.query.pass
      if (server !== 'localhost') {
        logger.warn(`Cannot call check_password on user on server ${server as string}.`)
        res.status(200).send('false')
        return
      }
      if (user === 'john' && pass === 'password') {
        res.status(200).send('true')
        return
      }
      res.status(200).send('false')
    }
  ))

  router.get('/user/user_exists', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
      const settings = await options.settingsManager.getSettings([
        'chat-use-prosody',
        'chat-only-locals',
        'chat-all-lives',
        'chat-all-non-lives',
        'chat-videos-list'
      ])
      if (!settings['chat-use-prosody']) {
        logger.warn('Prosody chat is not active')
        res.status(200).send('false')
        return
      }
      const user = req.query.user
      const server = req.query.server
      if (server !== 'localhost') {
        logger.warn(`Cannot call user_exists on user on server ${server as string}.`)
        res.status(200).send('false')
        return
      }
      if (user === 'john') {
        res.status(200).send('true')
      }
      res.status(200).send('false')
    }
  ))

  router.post('/user/set_password', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
      res.sendStatus(501)
    }
  ))

  router.post('/user/remove_user', asyncMiddleware(
    async (req: Request, res: Response, _next: NextFunction) => {
      res.sendStatus(501)
    }
  ))

  return router
}

export {
  initApiRouter
}
