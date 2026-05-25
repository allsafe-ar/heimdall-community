import { io } from 'socket.io-client'

let socket = null

export function getSocket(token) {
  if (!socket) {
    // In production, connect to same origin; in dev, to localhost:3005
    const url = import.meta.env.DEV ? 'http://localhost:3005' : window.location.origin
    socket = io(url, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
