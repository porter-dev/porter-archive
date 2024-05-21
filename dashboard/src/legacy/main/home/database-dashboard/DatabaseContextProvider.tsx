import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import notFound from "legacy/assets/not-found.png";
import Loading from "legacy/components/Loading";
import Container from "legacy/components/porter/Container";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  datastoreValidator,
  type ClientDatastore,
} from "legacy/lib/databases/types";
import api from "legacy/shared/api";
import styled from "styled-components";
import { z } from "zod";

import { Context } from "shared/Context";

import { SUPPORTED_DATASTORE_TEMPLATES } from "./constants";

type DatastoreContextType = {
  datastore: ClientDatastore;
  projectId: number;
};

const DatastoreContext = createContext<DatastoreContextType | null>(null);

export const useDatastoreContext = (): DatastoreContextType => {
  const ctx = React.useContext(DatastoreContext);
  if (!ctx) {
    throw new Error(
      "useDatastoreContext must be used within a DatastoreContextProvider"
    );
  }
  return ctx;
};

type DatastoreContextProviderProps = {
  datastoreName?: string;
  children: JSX.Element;
};
export const DatastoreContextProvider: React.FC<
  DatastoreContextProviderProps
> = ({ datastoreName, children }) => {
  const { currentProject } = useContext(Context);
  const paramsExist =
    !!datastoreName && !!currentProject && currentProject.id !== -1;
  const { data: datastore, status } = useQuery(
    ["getDatastore", datastoreName, currentProject?.id],
    async () => {
      if (!paramsExist) {
        return;
      }
      const response = await api.getDatastore(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          datastore_name: datastoreName,
        }
      );

      const results = await z
        .object({ datastore: datastoreValidator })
        .parseAsync(response.data);

      const datastore = results.datastore;
      const matchingTemplate = SUPPORTED_DATASTORE_TEMPLATES.find(
        (t) =>
          t.type.name === datastore.type && t.engine.name === datastore.engine
      );

      // this datastore is a type we do not recognize
      if (!matchingTemplate) {
        return;
      }

      return {
        ...results.datastore,
        template: matchingTemplate,
      };
    },
    {
      enabled: paramsExist,
      refetchInterval: 5000,
      refetchOnWindowFocus: true,
    }
  );

  if (status === "loading" || !paramsExist) {
    return <Loading />;
  }

  if (status === "error" || !datastore) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            No datastore matching &quot;{datastoreName}&quot; was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/datastores">Return to dashboard</Link>
      </Placeholder>
    );
  }

  return (
    <DatastoreContext.Provider
      value={{
        datastore,
        projectId: currentProject.id,
      }}
    >
      {children}
    </DatastoreContext.Provider>
  );
};

const PlaceholderIcon = styled.img`
  height: 13px;
  margin-right: 12px;
  opacity: 0.65;
`;
const Placeholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-size: 13px;
`;
