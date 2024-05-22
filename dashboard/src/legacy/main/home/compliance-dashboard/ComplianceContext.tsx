import React, {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ComplianceProfile,
  Contract,
  EKS,
  EKSLogging,
} from "@porter-dev/api-contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type APIContract } from "legacy/lib/clusters/types";
import { useLatestClusterContract } from "legacy/lib/hooks/useCluster";
import api from "legacy/shared/api";
import { match } from "ts-pattern";
import { z } from "zod";

import {
  checkGroupValidator,
  vendorCheckValidator,
  type CheckGroup,
  type VendorCheck,
} from "./types";

type ComplianceProfileType = "soc2" | "hipaa";
type ComplianceVendorType = "vanta" | "oneleet";

type ProjectComplianceContextType = {
  projectId: number;
  clusterId: number;
  checkGroups: CheckGroup[];
  vendorChecks: VendorCheck[];
  latestContractProto: Contract | undefined;
  latestContractDB?: APIContract;
  checksLoading: boolean;
  contractLoading: boolean;
  updateInProgress: boolean;
  profile: ComplianceProfileType;
  setProfile: Dispatch<SetStateAction<ComplianceProfileType>>;
  vendor: ComplianceVendorType;
  setVendor: Dispatch<SetStateAction<ComplianceVendorType>>;
  updateContractWithProfile: () => Promise<void>;
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
  const [profile, setProfile] = useState<ComplianceProfileType>("soc2");
  const [vendor, setVendor] = useState<ComplianceVendorType>("oneleet");

  const {
    contractDB: latestContractDB,
    contractProto: latestContractProto,
    isLoading: contractLoading,
  } = useLatestClusterContract({ clusterId });

  const {
    data: { checkGroups = [], vendorChecks = [] } = {},
    isLoading: checksLoading,
  } = useQuery(
    [
      {
        projectId,
        clusterId,
        condition: latestContractDB?.condition ?? "",
        profile,
        vendor,
        name: "getComplianceChecks",
      },
    ],
    async () => {
      const res = await api.getComplianceChecks(
        "<token>",
        { vendor, profile },
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

  const updateContractWithProfile = async (): Promise<void> => {
    try {
      setUpdateInProgress(true);

      if (!latestContractProto?.cluster) {
        return;
      }

      const cidrAllowList = import.meta.env.VITE_PORTER_CIDRS
        ? import.meta.env.VITE_PORTER_CIDRS.split(",")
        : [];

      const updatedKindValues = match(latestContractProto.cluster.kindValues)
        .with({ case: "eksKind" }, ({ value }) => ({
          case: "eksKind" as const,
          value: new EKS({
            ...value,
            ...(cidrAllowList.length > 0 && {
              controlPlaneCidrAllowlist: cidrAllowList,
            }),
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

      const complianceProfiles = new ComplianceProfile({
        ...latestContractProto.complianceProfiles,
        ...(profile === "soc2" && { soc2: true }),
        ...(profile === "hipaa" && { hipaa: true }),
      });

      const updatedContract = new Contract({
        ...latestContractProto,
        cluster: {
          ...latestContractProto.cluster,
          kindValues: updatedKindValues,
          isSoc2Compliant: true,
        },
        complianceProfiles,
      });

      await api.createContract("<token>", updatedContract, {
        project_id: projectId,
      });
      await queryClient.invalidateQueries([
        projectId,
        clusterId,
        "getContracts",
      ]);
    } catch (err) {
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
        latestContractProto,
        latestContractDB,
        checksLoading,
        contractLoading,
        updateInProgress,
        profile,
        setProfile,
        vendor,
        setVendor,
        updateContractWithProfile,
      }}
    >
      {children}
    </ProjectComplianceContext.Provider>
  );
};
