import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import type { Stack } from "../types";

interface StoreType {
  stack: Stack;
}

const defaultValues: StoreType = {
  stack: {} as Stack,
};

export const ExpandedStackStore = createContext(defaultValues);

const ExpandedStackStoreProvider: React.FC = ({ children }) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const [stack, setStack] = useState<Stack>(null);

  const { namespace, stack_id } = useParams<{
    namespace: string;
    stack_id: string;
  }>();
  const { pushFiltered } = useRouting();

  useEffect(() => {
    let isSubscribed = true;

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
        if (isSubscribed) {
          setStack(res.data);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setCurrentError("Couldn't find any stack with the given ID");
          pushFiltered("/stacks", []);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentCluster, currentProject, namespace, stack_id]);

  if (stack === null) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  return (
    <ExpandedStackStore.Provider value={{ stack }}>
      {children}
    </ExpandedStackStore.Provider>
  );
};

export default ExpandedStackStoreProvider;
