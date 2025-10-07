import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
type Message = {
  [key: string]: any;
};
type Thresholds = {
  tempLowMax: number;
  tempHighMin: number;
  humLowMax: number;
  humHighMin: number;
};
const defaultThresholds: Thresholds = {
  tempLowMax: 20,
  tempHighMin: 28,
  humLowMax: 30,
  humHighMin: 70,
};
const STORAGE_KEY = "threshold_settings";
type WebSocketContextType = {
  sendMessage: (message: Message) => void;
  lastMessage: string | null;
  isConnected: boolean;
  thresholds: Thresholds;
  setThresholds: (values: Partial<Thresholds>) => void;
  names: Record<string, string>;
  setNames: (names: Record<string, string>) => void;
  WS_URL: string;
  saveWsUrl: (url: string) => void;
  loadWsUrl: () => Promise<void>;
};

const WebSocketContext = createContext<WebSocketContextType>({
  sendMessage: () => {},
  lastMessage: null,
  isConnected: false,
  thresholds: defaultThresholds,
  setThresholds: () => {},
  names: {},
  setNames: () => {},
  WS_URL: "",
  saveWsUrl: () => {},
  loadWsUrl: () => Promise.resolve(),
});

export const WebSocketProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [thresholds, setThresholdState] =
    useState<Thresholds>(defaultThresholds);
  const [names, setNames] = useState<Record<string, string>>({});
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const [WS_URL, setWS_URL] = useState<string>("ws://192.168.1.137:81");
  useEffect(() => {
    loadWsUrl()
  }, [])
  const connect = useCallback(() => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(WS_URL);
    webSocketRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket connected");
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = event.data;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "ping") {
          webSocketRef.current?.send(JSON.stringify({ type: "pong" }));
        }
        if (parsed.type === "thresholds") {
          const received: Partial<Thresholds> = {
            tempLowMax: parseFloat(parsed.tempLowMax),
            tempHighMin: parseFloat(parsed.tempHighMin),
            humLowMax: parseFloat(parsed.humLowMax),
            humHighMin: parseFloat(parsed.humHighMin),
          };
          const isDefault =
            JSON.stringify(thresholds) === JSON.stringify(defaultThresholds);
          if (isDefault) {
            const merged = { ...thresholds, ...received };
            setThresholdState(merged);
            AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged)).catch(
              console.warn
            );
          }
        }
        if (parsed.type === "sensor_names") {
          setNames(parsed.names);
        }
      } catch (e) {
        // Ignorar si no es JSON
      }
      setLastMessage(data);
    };

    ws.onclose = () => {
      console.warn("⚠️ WebSocket closed");
      setIsConnected(false);
      reconnectTimeout.current = setTimeout(() => connect(), 5000);
    };

    ws.onerror = (error) => {
      console.error("❌ WebSocket error:", error);
      setIsConnected(false);
      ws.close();
    };
  }, []);
  const sendMessage = useCallback((message: Message) => {
    if (webSocketRef.current?.readyState === WebSocket.OPEN) {
      webSocketRef.current.send(JSON.stringify(message));
    } else {
      console.warn("⚠️ WebSocket not open. Message not sent.");
      setIsConnected(false);
    }
  }, []);
  const setThresholds = useCallback(
    (values: Partial<Thresholds>) => {
      const updated = { ...thresholds, ...values };
      setThresholdState(updated);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) =>
        console.warn("⚠️ Error guardando thresholds", e)
      );
    },
    [thresholds]
  );
  useEffect(() => {
    const loadStoredThresholds = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setThresholdState((prev) => ({ ...prev, ...parsed }));
        }
      } catch (e) {
        console.warn("⚠️ Error cargando thresholds", e);
      }
    };

    loadStoredThresholds();
  }, []);
  useEffect(() => {
    connect();
    return () => {
      if (webSocketRef.current) webSocketRef.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const saveWsUrl = async (url:string) => {
    try {
      await AsyncStorage.setItem("WS_URL", url);
      setWS_URL(url);
    }
    catch (e) {
      console.warn("⚠️ Error guardando WS_URL", e)
    }
  }
  const loadWsUrl = async () => {
    try {
      const stored = await AsyncStorage.getItem("WS_URL");
      if (stored) {
        setWS_URL(stored);
      }
    } catch (e) {
      console.warn("⚠️ Error cargando WS_URL", e);
    }
  }
  return (
    <WebSocketContext.Provider
      value={{
        sendMessage,
        lastMessage,
        isConnected,
        thresholds,
        setThresholds,
        names,
        setNames,
        WS_URL,
        saveWsUrl,
        loadWsUrl
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => useContext(WebSocketContext);
export const useThresholds = () => {
  const { thresholds, setThresholds } = useWebSocketContext();
  return { thresholds, setThresholds };
};