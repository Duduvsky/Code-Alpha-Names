import { useEffect } from "react";

interface EventNotificationProps {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
}

const EventNotification = ({ message, type = "info", onClose }: EventNotificationProps) => {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const getAccentColor = () => {
    switch (type) {
      case "success": return "bg-green-500";
      case "error": return "bg-red-500";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="relative flex items-center bg-white text-black px-4 py-3 mb-2 rounded-lg shadow animate-fade-slide overflow-hidden">
      {/* Detalhe colorido colado no canto esquerdo */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getAccentColor()}`}></div>
      <span className="flex-1 text-md break-words pl-1">{message}</span>
      <button
        onClick={onClose}
        className="cursor-pointer ml-4 text-gray-500 hover:text-gray-700 font-bold hover:cursor-pointer"
      >
        X
      </button>
    </div>
  );
};

export default EventNotification;
