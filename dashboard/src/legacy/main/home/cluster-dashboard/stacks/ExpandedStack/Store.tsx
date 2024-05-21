import React, { createContext, useContext, useEffect, useState } from "react";
import Loading from "legacy/components/Loading";
import Placeholder from "legacy/components/OldPlaceholder";
import api from "legacy/shared/api";
import { useRouting } from "legacy/shared/routing";
import { useParams } from "react-router";

import { Context } from "shared/Context";

import type { Stack } from "../types";

interface StoreType {
  stack: Stack;
  refreshStack: () => Promise<void>;
}

const defaultValues: StoreType = {
  stack: {} as Stack,
  refreshStack: async () => {},
};

export const ExpandedStackStore = createContext(defaultValues);

const ExpandedStackStoreProvider: React.FC = ({ children }) => {
  const { currentProject, currentCluster, setCurrentError } =
    useContext(Context);

  const [stack, setStack] = useState<Stack>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { namespace, stack_id } = useParams<{
    namespace: string;
    stack_id: string;
  }>();
  const { pushFiltered } = useRouting();

  const getStack = async (props: { subscribed: boolean }) => {
    setIsLoading(true);
    api
      .getStack<Stack>(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace,
          stack_id,
        }
      )
      .then((res) => {
        if (props.subscribed) {
          setStack(res.data);
        }
      })
      .catch(() => {
        if (props.subscribed) {
          setCurrentError("Couldn't find any stack with the given ID");
          pushFiltered("/stacks", []);
        }
      })
      .finally(() => {
        if (props.subscribed) {
          setIsLoading(false);
        }
      });
  };

  useEffect(() => {
    let isSubscribed = { subscribed: true };

    getStack(isSubscribed);

    return () => {
      isSubscribed.subscribed = false;
    };
  }, [currentCluster, currentProject, namespace, stack_id]);

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  return (
    <ExpandedStackStore.Provider
      value={{
        stack,
        refreshStack: async () => {
          await getStack({ subscribed: true });
        },
      }}
    >
      {children}
    </ExpandedStackStore.Provider>
  );
};

export default ExpandedStackStoreProvider;
