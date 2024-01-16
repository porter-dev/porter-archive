import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import {
  datastoreListResponseValidator,
  type ClientDatastore,
} from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";
import notFound from "assets/not-found.png";

type DatabaseContextType = {
  datastore: ClientDatastore;
  projectId: number;
};

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const useDatabaseContext = (): DatabaseContextType => {
  const ctx = React.useContext(DatabaseContext);
  if (!ctx) {
    throw new Error(
      "useDatabaseContext must be used within a DatabaseContextProvider"
    );
  }
  return ctx;
};

type DatabaseContextProviderProps = {
  datastoreName?: string;
  children: JSX.Element;
};
export const DatabaseContextProvider: React.FC<
  DatabaseContextProviderProps
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
      const response = await api.getDatastores(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cloud_provider_id: cloudProviderId,
          cloud_provider_name: cloudProviderName,
          datastore_name: datastoreName,
          include_env_group: true,
          include_metadata: true,
        }
      );

      const results = await datastoreListResponseValidator.parseAsync(
        response.data
      );
      if (results.datastores.length !== 1) {
        return;
      }

      return results.datastores[0];
    },
    {
      enabled: paramsExist,
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
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
            No database matching &quot;{datastoreName}&quot; was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/databases">Return to dashboard</Link>
      </Placeholder>
    );
  }

  return (
    <DatabaseContext.Provider
      value={{
        datastore,
        projectId: currentProject.id,
      }}
    >
      {children}
    </DatabaseContext.Provider>
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
