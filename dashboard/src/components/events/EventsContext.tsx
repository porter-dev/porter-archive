import React, { createContext, useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";

export type Event = {
  id: number;
  project_id: number;
  cluster_id: number;
  owner_name: string;
  owner_type: string;
  event_type: "critical" | "normal";
  resource_type: string;
  name: string;
  namespace: string;
  message: string;
  reason: string;
  timestamp: string;
};

type EventsContextType = {
  isPorterAgentInstalled: boolean;
  isPorterAgentInstalling: boolean;
  isLoading: boolean;
  eventList: Event[];
  selectedEvent: Event | null;
  selectEvent: (id: number) => void;
  clearSelectedEvent: () => void;
  setLimit: (limit: number) => void;
  setResourceType: (newResourceType: "pod" | "hpa" | "node") => void;
  installPorterAgent: () => Promise<void>;
};

const defaultEventContext: EventsContextType = {
  eventList: [],
  isPorterAgentInstalled: false,
  isPorterAgentInstalling: false,
  isLoading: true,
  selectedEvent: null,
  selectEvent: () => {},
  clearSelectedEvent: () => {},
  setLimit: () => {},
  setResourceType: () => {},
  installPorterAgent: async () => {},
};

export const EventContext = createContext<EventsContextType>(
  defaultEventContext
);

type EventController = { type: string; name: string };

type Props = {
  controllers: EventController[];
  enableNodeEvents: boolean;
};

const EventsContextProvider: React.FC<Props> = ({
  children,
  controllers,
  enableNodeEvents,
}) => {
  // Porter agent related
  const [isPorterAgentInstalled, setIsPorterAgentInstalled] = useState<boolean>(
    false
  );
  const [
    isPorterAgentInstalling,
    setIsPorterAgentInstalling,
  ] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Event related
  const [eventList, setEventList] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedController, setSelectedController] = useState<EventController>(
    () => controllers[0] || undefined
  );

  // Pagination related
  const [limit, setLimit] = useState<number>(10);
  const [resourceType, setResourceType] = useState<"pod" | "hpa" | "node">(
    "pod"
  );
  // Currently only implemented one sort type
  const [sortBy] = useState<"timestamp">("timestamp");

  const { currentCluster, currentProject, setCurrentError } = useContext(
    Context
  );

  useEffect(() => {
    checkIfPorterAgentIsInstalled();
  }, [currentCluster, currentProject]);

  useEffect(() => {
    if (!isPorterAgentInstalling) {
      return () => {};
    }
    const interval = setInterval(() => {
      checkIfPorterAgentIsInstalled();
    }, 500);

    return () => clearInterval(interval);
  }, [isPorterAgentInstalling]);

  useEffect(() => {
    setIsLoading(true);
    // Clear out event list if the resource type or the selected controller changed
    if (
      resourceType !== eventList[0]?.resource_type ||
      selectedController.name !== eventList[0].name
    ) {
      setEventList([]);
    }

    getEventList();
  }, [isPorterAgentInstalled, selectedController, resourceType, sortBy]);

  const checkIfPorterAgentIsInstalled = async () => {
    try {
      await api.getPorterAgentIsInstalled(
        "<token>",
        {
          cluster_id: currentCluster.id,
        },
        {
          project_id: currentProject.id,
        }
      );
      setIsPorterAgentInstalled(true);
    } catch (error) {
      setIsPorterAgentInstalled(false);
      setCurrentError(JSON.stringify(error));
    }
  };

  const installPorterAgent = async () => {
    try {
      await api.installPorterAgent(
        "<token>",
        {
          cluster_id: currentCluster.id,
        },
        {
          project_id: currentProject.id,
        }
      );
      setIsPorterAgentInstalling(true);
    } catch (error) {}
  };

  const removeDuplicatedEvents = (events: Event[]) => {
    return events.reduce<Event[]>((prev, event, arr) => {
      if (prev.find((e) => e.id === event.id)) {
        return prev;
      }
      return [...prev, event];
    }, []);
  };

  const getEventList = async () => {
    try {
      const res = await api.getEvents(
        "<token>",
        {
          limit,
          skip: eventList.length,
          type: resourceType,
          sort_by: sortBy,
          owner_name: selectedController.name,
          owner_type: selectedController.type,
        },
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
        }
      );
      const newEventList = removeDuplicatedEvents([...eventList, ...res.data]);
      setEventList(newEventList);
    } catch (error) {
      setEventList([]);
      setCurrentError(JSON.stringify(error));
    }
  };

  const selectEvent = (id: number) => {
    const event = eventList.find((e) => e.id === id);
    setSelectedEvent(event);
  };

  const clearSelectedEvent = () => {
    setSelectedEvent(null);
  };

  return (
    <EventContext.Provider
      value={{
        isPorterAgentInstalled,
        isPorterAgentInstalling,
        isLoading,
        eventList,
        selectedEvent,
        selectEvent,
        clearSelectedEvent,
        setLimit,
        setResourceType,
        installPorterAgent,
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export default EventsContextProvider;
