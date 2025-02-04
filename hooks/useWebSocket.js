import { useEffect, useState } from "react";

const useWebSocket = (url) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const socket = new WebSocket(url);

    socket.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
    };

    socket.onerror = (error) => {
      console.error("WebSocket 오류:", error);
    };

    return () => {
      socket.close();
    };
  }, [url]);

  return data;
};

export default useWebSocket;
