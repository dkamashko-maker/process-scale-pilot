import { createContext, useContext, useState, ReactNode } from "react";
import type { ProcessEvent } from "@/data/runTypes";
import { getInitialEvents } from "@/data/runData";

export interface AuditRecord {
  id: string;
  timestamp: string;
  actor: string;
  action: "event_created" | "event_updated" | "event_deleted";
  entity_type: "process_event";
  entity_id: string;
  run_id: string;
  detail: string;
}

interface EventsContextType {
  events: ProcessEvent[];
  auditLog: AuditRecord[];
  addEvent: (event: Omit<ProcessEvent, "id">) => void;
  updateEvent: (id: string, updates: Partial<ProcessEvent>) => void;
  deleteEvent: (id: string) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<ProcessEvent[]>(() => getInitialEvents());
  const [auditLog, setAuditLog] = useState<AuditRecord[]>([]);

  const appendAudit = (record: Omit<AuditRecord, "id" | "timestamp">) => {
    setAuditLog((prev) => [
      { ...record, id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, timestamp: new Date().toISOString() },
      ...prev,
    ]);
  };

  const addEvent = (event: Omit<ProcessEvent, "id">) => {
    const id = `EVT-${Date.now()}`;
    setEvents((prev) =>
      [...prev, { ...event, id }].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    );
    appendAudit({
      actor: event.actor || "unknown",
      action: "event_created",
      entity_type: "process_event",
      entity_id: id,
      run_id: event.run_id,
      detail: `Logged ${event.event_type}${event.subtype ? ` / ${event.subtype}` : ""}${event.amount != null ? ` — ${event.amount} ${event.amount_unit}` : ""}`,
    });
  };

  const updateEvent = (id: string, updates: Partial<ProcessEvent>) => {
    const existing = events.find((e) => e.id === id);
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
    appendAudit({
      actor: updates.actor || existing?.actor || "unknown",
      action: "event_updated",
      entity_type: "process_event",
      entity_id: id,
      run_id: updates.run_id || existing?.run_id || "",
      detail: `Updated ${updates.event_type || existing?.event_type || "event"}`,
    });
  };

  const deleteEvent = (id: string) => {
    const existing = events.find((e) => e.id === id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
    appendAudit({
      actor: existing?.actor || "unknown",
      action: "event_deleted",
      entity_type: "process_event",
      entity_id: id,
      run_id: existing?.run_id || "",
      detail: `Deleted ${existing?.event_type || "event"}${existing?.subtype ? ` / ${existing.subtype}` : ""}`,
    });
  };

  return (
    <EventsContext.Provider value={{ events, auditLog, addEvent, updateEvent, deleteEvent }}>
      {children}
    </EventsContext.Provider>
  );
}

export function useEvents() {
  const context = useContext(EventsContext);
  if (!context) throw new Error("useEvents must be used within EventsProvider");
  return context;
}
