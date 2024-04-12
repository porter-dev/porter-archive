import { useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  ClientSecretResponse,
  CreditGrants,
  PaymentMethodList,
  PaymentMethodValidator,
  Plan,
} from "lib/billing/types";

import api from "shared/api";
import { Context } from "shared/Context";

type TUsePaymentMethod = {
  paymentMethodList: PaymentMethodList;
  refetchPaymentMethods: any;
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
  refetchPaymentEnabled: any;
};

type TGetPublishableKey = {
  publishableKey: string;
};

type TGetCredits = {
  creditGrants: CreditGrants;
};

type TGetPlan = {
  plan: Plan;
};

const embeddableDashboardColors = {
  grayDark: "Gray_dark",
  grayMedium: "Gray_medium",
  grayLight: "Gray_light",
  grayExtraLigth: "Gray_extralight",
  white: "White",
  primaryMedium: "Primary_medium",
  primaryLight: "Primary_light",
  usageLine0: "Usageline_0",
  usageLine1: "Usageline_1",
  usageLine2: "Usageline_2",
  usageLine3: "Usageline_3",
  usageLine4: "Usageline_4",
  usageLine5: "Usageline_5",
  usageLine6: "Usageline_6",
  usageLine7: "Usageline_7",
  usageLine8: "Usageline_8",
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
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
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
  const deletePaymentMethod = async (paymentMethodId: string) => {
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

  const createPaymentMethod = async () => {
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

  if (!currentProject?.id) {
    throw new Error("Project ID is missing");
  }

  // Fetch list of payment methods
  const paymentEnabledReq = useQuery(
    ["checkPaymentEnabled", currentProject?.id],
    async () => {
      const res = await api.getHasBilling(
        "<token>",
        {},
        { project_id: currentProject.id }
      );

      const data = z.boolean().parse(res.data);
      return data;
    }
  );

  return {
    hasPaymentEnabled: paymentEnabledReq.data ?? false,
    refetchPaymentEnabled: paymentEnabledReq.refetch,
  };
};

export const useCustomerDashboard = (dashboard: string): TGetUsageDashboard => {
  const { currentProject } = useContext(Context);

  const colorOverrides = [
    { name: embeddableDashboardColors.grayDark, value: "#121212" },
    { name: embeddableDashboardColors.grayMedium, value: "#DFDFE1" },
    { name: embeddableDashboardColors.grayLight, value: "#DFDFE1" },
    { name: embeddableDashboardColors.grayExtraLigth, value: "#00ff63" },
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
      console.log(res);
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
        return;
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
      return res.data;
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
    ["getCustomerPlan", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      const res = await api.getCustomerPlan(
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
    plan: planReq.data,
  };
};

export const useSetDefaultPaymentMethod = (): TSetDefaultPaymentMethod => {
  const { currentProject } = useContext(Context);

  const setDefaultPaymentMethod = async (paymentMethodId: string) => {
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
