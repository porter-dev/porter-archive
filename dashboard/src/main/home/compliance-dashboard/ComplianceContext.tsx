import React, { createContext, useContext, useMemo, useState } from "react";
import { Contract, EKS, EKSLogging } from "@porter-dev/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { match } from "ts-pattern";
import { z } from "zod";

import api from "shared/api";

import {
  checkGroupValidator,
  contractValidator,
  vendorCheckValidator,
  type APIContract,
  type CheckGroup,
  type VendorCheck,
} from "./types";

type ProjectComplianceContextType = {
  projectId: number;
  clusterId: number;
  checkGroups: CheckGroup[];
  vendorChecks: VendorCheck[];
  latestContractProto: Contract | null;
  latestContractDB?: APIContract;
  checksLoading: boolean;
  contractLoading: boolean;
  updateInProgress: boolean;
  updateContractWithSOC2: () => Promise<void>;
};

const ProjectComplianceContext =
  createContext<ProjectComplianceContextType | null>(null);

export const useCompliance = (): ProjectComplianceContextType => {
  const context = useContext(ProjectComplianceContext);
  if (!context) {
    throw new Error(
      "useCompliance must be used within a ProjectComplianceProvider"
    );
  }
  return context;
};

type ProjectComplianceProviderProps = {
  projectId: number;
  clusterId: number;
  children: React.ReactNode;
};

export const ProjectComplianceProvider: React.FC<
  ProjectComplianceProviderProps
> = ({ projectId, clusterId, children }) => {
  const queryClient = useQueryClient();
  const [updateInProgress, setUpdateInProgress] = useState(false);

  const { data: baseContract, isLoading: contractLoading } = useQuery(
    [projectId, clusterId, "getContracts"],
    async () => {
      const res = await api.getContracts(
        "<token>",
        {},
        { project_id: projectId }
      );

      const data = await z.array(contractValidator).parseAsync(res.data);

      return data.filter((contract) => contract.cluster_id === clusterId)[0];
    },
    {
      refetchInterval: 3000,
    }
  );

  const {
    data: { checkGroups = [], vendorChecks = [] } = {},
    isLoading: checksLoading,
  } = useQuery(
    [
      {
        projectId,
        clusterId,
        condition: baseContract?.condition ?? "",
        name: "getComplianceChecks",
      },
    ],
    async () => {
      const res = await api.getComplianceChecks(
        "<token>",
        { vendor: "vanta" },
        { projectId, clusterId }
      );

      const data = await z
        .object({
          check_groups: z.array(checkGroupValidator).optional().default([]),
          vendor_checks: z.array(vendorCheckValidator).optional().default([]),
        })
        .parseAsync(res.data);

      return {
        checkGroups: data.check_groups,
        vendorChecks: data.vendor_checks,
      };
    }
  );

  const latestContract = useMemo(() => {
    if (!baseContract) {
      return null;
    }

    return Contract.fromJsonString(atob(baseContract.base64_contract), {
      ignoreUnknownFields: true,
    });
  }, [baseContract?.base64_contract]);

  const updateContractWithSOC2 = async (): Promise<void> => {
    try {
      setUpdateInProgress(true);

      if (!latestContract?.cluster) {
        return;
      }

      const updatedKindValues = match(latestContract.cluster.kindValues)
        .with({ case: "eksKind" }, ({ value }) => ({
          case: "eksKind" as const,
          value: new EKS({
            ...value,
            enableKmsEncryption: true,
            enableEcrScanning: true,
            logging: new EKSLogging({
              enableApiServerLogs: true,
              enableAuditLogs: true,
              enableAuthenticatorLogs: true,
              enableCloudwatchLogsToS3: true,
              enableControllerManagerLogs: true,
              enableSchedulerLogs: true,
            }),
          }),
        }))
        .otherwise((kind) => kind);

      const updatedContract = new Contract({
        ...latestContract,
        cluster: {
          ...latestContract.cluster,
          kindValues: updatedKindValues,
          isSoc2Compliant: true,
        },
      });

      await api.createContract("<token>", updatedContract, {
        project_id: projectId,
      });
      await queryClient.invalidateQueries([
        projectId,
        clusterId,
        "getContracts",
      ]);
    } finally {
      setUpdateInProgress(false);
    }
  };

  return (
    <ProjectComplianceContext.Provider
      value={{
        projectId,
        clusterId,
        vendorChecks,
        checkGroups,
        latestContractProto: latestContract,
        latestContractDB: baseContract,
        checksLoading,
        contractLoading,
        updateInProgress,
        updateContractWithSOC2,
      }}
    >
      {children}
    </ProjectComplianceContext.Provider>
  );
};
