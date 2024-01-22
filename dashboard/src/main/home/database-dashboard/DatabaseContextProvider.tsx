import React, { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import styled from "styled-components";
import { z } from "zod";

import Loading from "components/Loading";
import Container from "components/porter/Container";
import Link from "components/porter/Link";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import { datastoreValidator, type ClientDatastore } from "lib/databases/types";

import api from "shared/api";
import { Context } from "shared/Context";
import notFound from "assets/not-found.png";

import { SUPPORTED_DATABASE_TEMPLATES } from "./constants";

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
      const matchingTemplate = SUPPORTED_DATABASE_TEMPLATES.find(
        (t) => t.type === datastore.type && t.engine.name === datastore.engine
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
