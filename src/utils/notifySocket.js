// 全局 STOMP over SockJS 客户端（单例）。
// 后端：端点 /ws（SockJS），按用户推送到 /user/queue/notifications，握手用 session cookie 鉴权。
// 经 vite 代理 /api -> localhost:8080，故连接 /api/ws（同源、自动带 cookie）。
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

let client = null

export function connectNotify({ onMessage, onConnect, onDisconnect }) {
  if (client && client.active) return client
  client = new Client({
    webSocketFactory: () => new SockJS('/api/ws'),
    reconnectDelay: 4000,          // 断线 4s 后自动重连
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe('/user/queue/notifications', (frame) => {
        try { onMessage && onMessage(JSON.parse(frame.body)) } catch (e) { /* ignore */ }
      })
      onConnect && onConnect()
    },
    onWebSocketClose: () => { onDisconnect && onDisconnect() },
    onStompError: () => { onDisconnect && onDisconnect() },
  })
  client.activate()
  return client
}

export function disconnectNotify() {
  if (client) { client.deactivate(); client = null }
}
