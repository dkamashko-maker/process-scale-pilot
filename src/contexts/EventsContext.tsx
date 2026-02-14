import { createContext, useContext, useState, ReactNode } from "react";
import type { ProcessEvent } from "@/data/runTypes";
import { getInitialEvents } from "@/data/runData";

interface EventsContextType {
  events: ProcessEvent[];
  addEvent: (event: Omit<ProcessEvent, "id">) => void;
  updateEvent: (id: string, updates: Partial<ProcessEvent>) => void;
  deleteEvent: (id: string) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ProcessEvent[]>(() => getInitialEvents());

  const addEvent = (event: Omit<ProcessEvent, "id">) => {
    const id = `EVT-${Date.now()}`;
    setEvents((prev) =>
      [...prev, { ...event, id }].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    );
  };

  const updateEvent = (id: string, updates: Partial<ProcessEvent>) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  };

  const deleteEvent = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <EventsContext.Provider value={{ events, addEvent, updateEvent, deleteEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error("useEvents must be used within EventsProvider");
  return context;
}
