import { createContext, useState, type ReactNode } from "react";
import EventNotification from "./EventNotification";

interface Notification {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
}

interface NotificationContextType {
  notify: (message: string, type?: "success" | "error" | "info") => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let idCounter = 0;

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = (message: string, type?: "success" | "error" | "info") => {
    const id = idCounter++;
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-2 z-50">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="animate-slide-in fade-out transition-all duration-300"
          >
            <EventNotification
              message={n.message}
              type={n.type}
              onClose={() =>
                setNotifications((prev) => prev.filter((m) => m.id !== n.id))
              }
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
