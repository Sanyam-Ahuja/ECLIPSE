import { useEffect, useRef, useState, useCallback } from "react";

export function useWebSocket(url: string | null) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    if (!url) return;
    
    console.log(`Connecting to WS: ${url}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WS Connected");
      setConnected(true);
      reconnectDelay.current = 1000; // Reset backoff
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [...prev, data]);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    ws.onclose = () => {
      console.log("WS Disconnected");
      setConnected(false);
      
      // Exponential backoff reconnect
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = (err) => {
      console.error("WS Error:", err);
    };
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect loop on unmount
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  return { connected, messages, send };
}

export function useJobStream(jobId: string | null, token: string | null) {
  // Determine Base URL from env
  const httpUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  
  // Replace http:// with ws:// and https:// with wss://
  const baseUrl = httpUrl.replace(/^http/, "ws");

  const wsUrl = jobId && token 
    ? `${baseUrl}/ws/job/${jobId}?token=${token}` 
    : null;
    
  return useWebSocket(wsUrl);
}
