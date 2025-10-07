import { useEffect, useRef, useState, useCallback } from "react"

type Message = {
  [key: string]: any
}

export default function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const webSocketRef = useRef<WebSocket | null>(null)
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null)
  const keepAliveInterval = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(url)
    webSocketRef.current = ws

    ws.onopen = () => {
      console.log("✅ WebSocket connected")
      setIsConnected(true)

      keepAliveInterval.current = setInterval(() => {
        if (webSocketRef.current?.readyState === WebSocket.OPEN) {
          webSocketRef.current.send(JSON.stringify({ type: "ping" }))
        }
      }, 10000)
    }

    ws.onmessage = (event) => {
      setLastMessage(event.data)
    }

    ws.onclose = () => {
      console.warn("⚠️ WebSocket closed")
      setIsConnected(false)
      if (keepAliveInterval.current) clearInterval(keepAliveInterval.current)

      reconnectTimeout.current = setTimeout(() => connect(), 5000)
    }

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error)
      setIsConnected(false)
      ws.close()
    }
  }, [url])

  const sendMessage = useCallback((message: Message) => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message))
    } else {
      console.warn("⚠️ WebSocket is not open. Message not sent.")
      setIsConnected(false)
    }
  }, [])

  // Verifica activamente el estado real del WebSocket cada 3 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      const ws = webSocketRef.current
      const actualState = ws?.readyState === WebSocket.OPEN
      setIsConnected((prev) => (prev !== actualState ? actualState : prev))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    connect()

    return () => {
      if (webSocketRef.current) webSocketRef.current.close()
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current)
      if (keepAliveInterval.current) clearInterval(keepAliveInterval.current)
    }
  }, [connect])

  return { sendMessage, isConnected, lastMessage }
}
