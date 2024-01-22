import { useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "shared/api";
import { Context } from "shared/Context";

const checkGroupValidator = z.object({
  name: z.string(),
  status: z.enum(["passed", "failed"]),
  message: z.string(),
});

const vendorCheckValidator = z.object({
  check: z.string(),
  check_group: z.string(),
  status: z.enum(["passed", "failing", "not_applicable"]),
  reason: z.string(),
  link: z.string().optional(),
});
export type VendorCheck = z.infer<typeof vendorCheckValidator>;

const contractValidator = z.object({
  id: z.string(),
  base64_contract: z.string(),
  cluster_id: z.number(),
  project_id: z.number(),
  condition: z.enum([
    "",
    "QUOTA_REQUEST_FAILED",
    "RETRYING_TOO_LONG",
    "KUBE_APPLY_FAILED",
    "FATAL_PROVISIONING_ERROR",
    "ERROR_READING_MSG",
    "MSG_CAUSED_PANIC",
    "SUCCESS",
    "DELETING",
    "DELETED",
    "COMPLIANCE_CHECK_FAILED",
  ]),
  condition_metadata: z.discriminatedUnion("code", [
    z.object({
      code: z.literal("SUCCESS"),
      message: z.string().optional(),
      metadata: z.object({}),
    }),
    z.object({
      code: z.literal("COMPLIANCE_CHECK_FAILED"),
      message: z.string().optional(),
      metadata: z.object({
        check_groups: z.array(checkGroupValidator),
      }),
    }),
    // all other codes are just "code" and "message"
    z.object({
      code: z.literal("QUOTA_REQUEST_FAILED"),
      message: z.string().optional(),
    }),
    z.object({
      code: z.literal("RETRYING_TOO_LONG"),
      message: z.string().optional(),
    }),
    z.object({
      code: z.literal("KUBE_APPLY_FAILED"),
      message: z.string().optional(),
    }),
    z.object({
      code: z.literal("FATAL_PROVISIONING_ERROR"),
      message: z.string().optional(),
    }),
    z.object({
      code: z.literal("ERROR_READING_MSG"),
      message: z.string().optional(),
    }),
    z.object({
      code: z.literal("MSG_CAUSED_PANIC"),
      message: z.string().optional(),
    }),
  ]),
});
type APIContract = z.infer<typeof contractValidator>;

type ComplianceCheckHook = {
  checkGroups: Array<z.infer<typeof checkGroupValidator>>;
  vendorChecks: Array<z.infer<typeof vendorCheckValidator>>;
  actionRequired: boolean;
  provisioningStatus: {
    state: "pending" | "success" | "failed";
    message: string;
  };
  latestContract?: APIContract;
  loading: boolean;
};

export const useComplianceChecks = (): ComplianceCheckHook => {
  const { currentProject, currentCluster } = useContext(Context);

  const {
    data: { checkGroups = [], vendorChecks = [] } = {},
    isLoading: checksLoading,
  } = useQuery(
    [currentProject?.id, currentCluster?.id, "getComplianceChecks"],
    async () => {
      if (
        !currentProject ||
        !currentCluster ||
        currentCluster.id === -1 ||
        currentProject.id === -1
      ) {
        return;
      }

      const res = await api.getComplianceChecks(
        "<token>",
        { vendor: "vanta" },
        { projectId: currentProject.id, clusterId: currentCluster.id }
      );

      const data = await z
        .object({
          check_groups: z.array(checkGroupValidator).optional().default([]),
          vendor_checks: z.array(vendorCheckValidator),
        })
        .parseAsync(res.data);

      return {
        checkGroups: data.check_groups,
        vendorChecks: data.vendor_checks,
      };
    }
  );

  const { data: latestContract, isLoading: contractLoading } = useQuery(
    [currentProject?.id, currentCluster?.id, "getContracts"],
    async () => {
      if (
        !currentProject ||
        !currentCluster ||
        currentCluster.id === -1 ||
        currentProject.id === -1
      ) {
        return;
      }

      const res = await api.getContracts(
        "<token>",
        {},
        { project_id: currentProject.id }
      );

      const data = await z.array(contractValidator).parseAsync(res.data);

      return data.filter(
        (contract) => contract.cluster_id === currentCluster.id
      )[0];
    }
  );

  const actionRequired = useMemo(
    () => vendorChecks.some((c) => c.status === "failing"),
    [vendorChecks]
  );

  const provisioningStatus = useMemo(() => {
    if (!latestContract || latestContract.condition === "") {
      return {
        state: "pending" as const,
        message: latestContract?.condition_metadata.message ?? "",
      };
    }

    if (latestContract.condition === "SUCCESS") {
      return {
        state: "success" as const,
        message: latestContract.condition_metadata.message ?? "",
      };
    }

    return {
      state: "failed" as const,
      message: latestContract.condition_metadata.message ?? "",
    };
  }, [latestContract?.condition]);

  return {
    checkGroups,
    vendorChecks,
    actionRequired,
    provisioningStatus,
    latestContract,
    loading: checksLoading || contractLoading,
  };
};
