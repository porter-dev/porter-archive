import { useContext, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { z } from "zod";

import {
  ClientSecretResponse,
  CreditGrantsValidator,
  PaymentMethodValidator,
  PlanValidator,
  Plan,
  UsageValidator,
  type CreditGrants,
  type PaymentMethod,
  type PaymentMethodList,
  type UsageList,
} from "lib/billing/types";

import api from "shared/api";
import { Context } from "shared/Context";

type TUsePaymentMethod = {
  paymentMethodList: PaymentMethodList;
  refetchPaymentMethods: (options: {
    throwOnError: boolean;
    cancelRefetch: boolean;
  }) => Promise<UseQueryResult>;
  deletingIds: string[];
  deletePaymentMethod: (paymentMethodId: string) => Promise<void>;
};

type TCreatePaymentMethod = {
  createPaymentMethod: () => Promise<string>;
};

type TSetDefaultPaymentMethod = {
  setDefaultPaymentMethod: (paymentMethodId: string) => Promise<void>;
};

type TCheckHasPaymentEnabled = {
  hasPaymentEnabled: boolean;
  refetchPaymentEnabled: (options: {
    throwOnError: boolean;
    cancelRefetch: boolean;
  }) => Promise<UseQueryResult>;
};

type TGetPublishableKey = {
  publishableKey: string;
};

type TGetUsageDashboard = {
  url: string;
};

type TGetCredits = {
  creditGrants: CreditGrants | undefined;
};

type TGetPlan = {
  plan: Plan | undefined;
};

type TGetUsage = {
  usage: UsageList | undefined;
};

const embeddableDashboardColors = {
  grayDark: "Gray_dark",
  grayMedium: "Gray_medium",
  grayLight: "Gray_light",
  grayExtraLigth: "Gray_extralight",
  white: "White",
  primaryMedium: "Primary_medium",
  primaryLight: "Primary_light",
};

export const usePaymentMethods = (): TUsePaymentMethod => {
  const { currentProject } = useContext(Context);

  // State has be shared so that payment methods can be removed
  // from the Billing page once they are deleted
  const [paymentMethodList, setPaymentMethodList] = useState<PaymentMethodList>(
    []
  );
  const [deletingIds, setDeletingIds] = useState<string[]>([]);

  // Fetch list of payment methods
  const paymentMethodReq = useQuery(
    ["getPaymentMethods", currentProject?.id],
    async (): Promise<PaymentMethod[]> => {
      if (!currentProject?.id || currentProject.id === -1) {
        return [];
      }
      const listResponse = await api.listPaymentMethod(
        "<token>",
        {},
        { project_id: currentProject?.id }
      );

      const data = PaymentMethodValidator.array().parse(listResponse.data);
      setPaymentMethodList(data);

      return data;
    }
  );

  // Delete list of payment methods
  const deletePaymentMethod = async (
    paymentMethodId: string
  ): Promise<void> => {
    if (!currentProject?.id) {
      throw new Error("Project ID is missing");
    }
    if (!paymentMethodId) {
      throw new Error("Payment Method ID is missing");
    }
    deletingIds.push(paymentMethodId);

    const resp = await api.deletePaymentMethod(
      "<token>",
      {},
      { project_id: currentProject?.id, payment_method_id: paymentMethodId }
    );
    if (resp.status !== 200) {
      throw new Error("Failed to delete payment method");
    }

    setPaymentMethodList(
      paymentMethodList.filter(
        (paymentMethod) => paymentMethod.id !== paymentMethodId
      )
    );
    setDeletingIds(
      deletingIds.filter((deleteId) => deleteId !== paymentMethodId)
    );
  };

  return {
    paymentMethodList,
    refetchPaymentMethods: paymentMethodReq.refetch,
    deletingIds,
    deletePaymentMethod,
  };
};

export const useCreatePaymentMethod = (): TCreatePaymentMethod => {
  const { currentProject } = useContext(Context);

  const createPaymentMethod = async (): Promise<string> => {
    const resp = await api.addPaymentMethod(
      "<token>",
      {},
      { project_id: currentProject?.id }
    );

    const clientSecret = ClientSecretResponse.parse(resp.data);

    return clientSecret;
  };

  return {
    createPaymentMethod,
  };
};

export const checkIfProjectHasPayment = (): TCheckHasPaymentEnabled => {
  const { currentProject } = useContext(Context);

  // Check if payment is enabled for the project
  const paymentEnabledReq = useQuery(
    currentProject?.id ? ["checkPaymentEnabled", currentProject.id] : ["checkPaymentEnabled", null],
    currentProject?.id
      ? async (): Promise<boolean> => {
        const res = await api.getHasBilling(
          "<token>",
          {},
          { project_id: currentProject.id }
        );

        const data = z.boolean().parse(res.data);
        return data;
      }
      : async () => false
  );

  return {
    hasPaymentEnabled: paymentEnabledReq.data ?? false,
    refetchPaymentEnabled: paymentEnabledReq.refetch,
  };
};

export const useCustomeUsageDashboard = (
  dashboard: string
): TGetUsageDashboard => {
  const { currentProject } = useContext(Context);

  const colorOverrides = [
    { name: embeddableDashboardColors.grayDark, value: "#121212" },
    { name: embeddableDashboardColors.grayMedium, value: "#DFDFE1" },
    { name: embeddableDashboardColors.grayLight, value: "#DFDFE1" },
    { name: embeddableDashboardColors.grayExtraLigth, value: "#DFDFE1" },
    { name: embeddableDashboardColors.white, value: "#121212" },
    { name: embeddableDashboardColors.primaryLight, value: "#121212" },
    { name: embeddableDashboardColors.primaryMedium, value: "#DFDFE1" },
  ];

  // Return an embeddable dashboard for the customer
  const dashboardReq = useQuery(
    ["getUsageDashboard", currentProject?.id, dashboard],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      const res = await api.getUsageDashboard(
        "<token>",
        {
          dashboard,
          color_overrides: colorOverrides,
        },
        {
          project_id: currentProject?.id,
        }
      );
      return res.data;
    },
    {
      staleTime: Infinity,
    }
  );

  return {
    url: dashboardReq.data,
  };
};

export const usePublishableKey = (): TGetPublishableKey => {
  const { currentProject } = useContext(Context);

  // Fetch list of payment methods
  const keyReq = useQuery(
    ["getPublishableKey", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }
      const res = await api.getPublishableKey(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
        }
      );
      return res.data;
    }
  );

  return {
    publishableKey: keyReq.data,
  };
};

export const usePorterCredits = (): TGetCredits => {
  const { currentProject } = useContext(Context);

  // Fetch available credits
  const creditsReq = useQuery(
    ["getPorterCredits", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      const res = await api.getPorterCredits(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
        }
      );
      return CreditGrantsValidator.parse(res.data);
    }
  );

  return {
    creditGrants: creditsReq.data,
  };
};

export const useCustomerPlan = (): TGetPlan => {
  const { currentProject } = useContext(Context);

  // Fetch current plan
  const planReq = useQuery(
    currentProject?.id ? ["getCustomerPlan", currentProject.id] : ["getCustomerPlan", null],
    currentProject?.id
      ? async (): Promise<PlanType> => {
        const res = await api.getCustomerPlan(
          "<token>",
          {},
          { project_id: currentProject.id }
        );

        const plan = PlanValidator.parse(res.data);
        return plan;
      }
      : async () => null
  );

  return {
    plan: planReq.data,
  };
};

export const useCustomerUsage = (
  windowSize: string,
  currentPeriod: boolean
): TGetUsage => {
  const { currentProject } = useContext(Context);

  // Fetch customer usage
  const usageReq = useQuery(
    ["listCustomerUsage", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      const res = await api.getCustomerUsage(
        "<token>",
        {
          window_size: windowSize,
          current_period: currentPeriod,
        },
        {
          project_id: currentProject?.id,
        }
      );
      const usage = UsageValidator.array().parse(res.data);
      return usage;
    }
  );

  return {
    usage: usageReq.data,
  };
};

export const useSetDefaultPaymentMethod = (): TSetDefaultPaymentMethod => {
  const { currentProject } = useContext(Context);

  const setDefaultPaymentMethod = async (
    paymentMethodId: string
  ): Promise<void> => {
    // Set payment method as default
    const res = await api.setDefaultPaymentMethod(
      "<token>",
      {},
      { project_id: currentProject?.id, payment_method_id: paymentMethodId }
    );

    if (res.status !== 200) {
      throw Error("failed to set payment method as default");
    }
  };

  return {
    setDefaultPaymentMethod,
  };
};
