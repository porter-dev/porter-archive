import React, { createContext, useCallback, useContext, useMemo } from "react";
import { Contract } from "@porter-dev/api-contracts";
import { useQueryClient } from "@tanstack/react-query";
import notFound from "legacy/assets/not-found.png";
import Loading from "legacy/components/Loading";
import Container from "legacy/components/porter/Container";
import Link from "legacy/components/porter/Link";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import { updateExistingClusterContract } from "legacy/lib/clusters";
import {
  clusterValidator,
  type ClientCluster,
  type ClientClusterContract,
  type ClientNode,
} from "legacy/lib/clusters/types";
import { useCluster, useClusterNodeList } from "legacy/lib/hooks/useCluster";
import { useClusterAnalytics } from "legacy/lib/hooks/useClusterAnalytics";
import api from "legacy/shared/api";
import styled from "styled-components";
import { z } from "zod";

import { Context } from "shared/Context";

type ClusterContextType = {
  cluster: ClientCluster;
  nodes: ClientNode[];
  projectId: number;
  isClusterUpdating: boolean;
  updateClusterVanityName: (name: string) => void;
  updateCluster: (clientContract: ClientClusterContract) => Promise<void>;
  deleteCluster: () => Promise<void>;
};

const ClusterContext = createContext<ClusterContextType | null>(null);

export const useClusterContext = (): ClusterContextType => {
  const ctx = React.useContext(ClusterContext);
  if (!ctx) {
    throw new Error(
      "useClusterContext must be used within a ClusterContextProvider"
    );
  }
  return ctx;
};

type ClusterContextProviderProps = {
  clusterId?: number;
  refetchInterval?: number;
  children: JSX.Element;
};

const ClusterContextProvider: React.FC<ClusterContextProviderProps> = ({
  clusterId,
  children,
  refetchInterval = 3000,
}) => {
  const { currentProject } = useContext(Context);
  const { cluster, isLoading, isError } = useCluster({
    clusterId,
    refetchInterval,
  });
  const { reportToAnalytics } = useClusterAnalytics();

  const { nodes } = useClusterNodeList({ clusterId, refetchInterval });

  const paramsExist =
    !!clusterId && !!currentProject && currentProject.id !== -1;

  const queryClient = useQueryClient();
  const updateClusterVanityName = useCallback(
    async (name: string) => {
      if (!paramsExist) {
        return;
      }
      await api.renameCluster(
        "<token",
        { name },
        {
          project_id: currentProject.id,
          cluster_id: clusterId,
        }
      );

      await queryClient.invalidateQueries(["getCluster"]);
    },
    [paramsExist, clusterId]
  );
  const updateCluster = useCallback(
    async (clientContract: ClientClusterContract) => {
      if (!paramsExist || !cluster?.contract) {
        return;
      }
      const latestContract = Contract.fromJsonString(
        atob(cluster.contract.base64_contract),
        {
          ignoreUnknownFields: true,
        }
      );
      if (!latestContract.cluster) {
        return;
      }
      const updatedContract = new Contract({
        ...latestContract,
        cluster: updateExistingClusterContract(
          clientContract,
          latestContract.cluster
        ),
      });

      await api.createContract("<token>", updatedContract, {
        project_id: currentProject.id,
      });

      await queryClient.invalidateQueries(["getCluster"]);
    },
    [paramsExist, clusterId, currentProject?.id, cluster?.contract]
  );
  const deleteCluster = useCallback(async () => {
    if (!paramsExist) {
      return;
    }

    void reportToAnalytics({
      projectId: currentProject.id,
      step: "cluster-delete",
    });

    await api.deleteCluster(
      "<token",
      {},
      {
        project_id: currentProject.id,
        cluster_id: clusterId,
      }
    );

    const res = await api.getClusters("<token>", {}, { id: currentProject.id });
    const parsed = await z.array(clusterValidator).parseAsync(res.data);
    if (parsed.length === 0) {
      await api.saveOnboardingState(
        "<token>",
        { current_step: "connect_source" },
        { project_id: currentProject.id }
      );
    }

    await queryClient.invalidateQueries(["getClusters"]);
  }, [paramsExist, clusterId, currentProject?.id]);
  const isClusterUpdating = useMemo(() => {
    return cluster?.contract?.condition === "" ?? false;
  }, [cluster?.contract?.condition]);

  if (isLoading || !paramsExist) {
    return <Loading />;
  }

  if (isError) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            Unable to load configuration for the provided cluster.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/infrastructure">Return to dashboard</Link>
      </Placeholder>
    );
  }

  if (!cluster) {
    return (
      <Placeholder>
        <Container row>
          <PlaceholderIcon src={notFound} />
          <Text color="helper">
            No cluster matching the provided ID was found.
          </Text>
        </Container>
        <Spacer y={1} />
        <Link to="/infrastructure">Return to dashboard</Link>
      </Placeholder>
    );
  }

  return (
    <ClusterContext.Provider
      value={{
        cluster,
        nodes,
        projectId: currentProject.id,
        isClusterUpdating,
        updateClusterVanityName,
        updateCluster,
        deleteCluster,
      }}
    >
      {children}
    </ClusterContext.Provider>
  );
};

export default ClusterContextProvider;

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
