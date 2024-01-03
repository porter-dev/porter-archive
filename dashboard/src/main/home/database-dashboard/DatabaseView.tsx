import { useQuery } from "@tanstack/react-query";
import React, { useMemo } from "react";
import { useParams, withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import api from "shared/api";

import Loading from "components/Loading";
import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";

import DatabaseHeader from "./DatabaseHeader";
import DatabaseTabs from "./DatabaseTabs";
import { CloudProviderDatastore, datastoreListResponseValidator } from "./types";

type Props = RouteComponentProps;

const DatabaseView: React.FC<Props> = ({ match }) => {
  let { projectId, cloudProviderName, cloudProviderId, datastoreName } = useParams();

  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        tab: z.string().optional(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        tab: undefined,
      };
    }

    return validParams.data;
  }, [match]);

  const { data: item, status } = useQuery(
    ["datastore", projectId, cloudProviderId, cloudProviderName, datastoreName],
    async (): Promise<CloudProviderDatastore> => {
      const response = await api.getDatastores(
        "<token>",
        {},
        {
          project_id: projectId,
          cloud_provider_id: cloudProviderId,
          cloud_provider_name: cloudProviderName,
          datastore_name: datastoreName,
          include_env_group: true,
          include_metadata: true,
        }
      );

      const results = await datastoreListResponseValidator.parseAsync(response.data);
      if (results.datastores.length === 0) {
        // TODO: fail the request
        return {};
      }

      return results.datastores.map((datastore): CloudProviderDatastore => {
        return {
          cloud_provider_name: cloudProviderName,
          cloud_provider_id: cloudProviderId,
          datastore: datastore,
          project_id: projectId,
        }
      })[0]
    },
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    }
  );

  return (
    <>
      {(status === "loading" || item == null) ?
        <Loading />
        :
        <StyledExpandedDB>
          <Back to="/databases" />
          <DatabaseHeader datastore={item.datastore} />
          <Spacer y={1} />
          <DatabaseTabs tabParam={params.tab} item={item} />
        </StyledExpandedDB>
      }
    </>
  );
};

export default withRouter(DatabaseView);


const StyledExpandedDB = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
