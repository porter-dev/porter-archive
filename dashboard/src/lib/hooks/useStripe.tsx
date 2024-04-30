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
  ReferralDetailsValidator,
  ReferralDetails
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
  hasPaymentEnabled: boolean | null;
  refetchPaymentEnabled: (options: {
    throwOnError: boolean;
    cancelRefetch: boolean;
  }) => Promise<UseQueryResult>;
};

type TGetPublishableKey = {
  publishableKey: string | null;
};

type TGetCredits = {
  creditGrants: CreditGrants | null;
};

type TGetPlan = {
  plan: Plan | null;
};

type TGetUsage = {
  usage: UsageList | null;
};

type TGetReferralDetails = {
  referralDetails: ReferralDetails
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
    async (): Promise<PaymentMethod[] | null> => {
      if (!currentProject?.billing_enabled) {
        return null;
      }

      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }

      try {
        const listResponse = await api.listPaymentMethod(
          "<token>",
          {},
          { project_id: currentProject?.id }
        );

        const data = PaymentMethodValidator.array().parse(listResponse.data);
        setPaymentMethodList(data);
        return data;
      } catch (error) {
        return null
      }
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

  if (!currentProject?.billing_enabled) {
    return { createPaymentMethod: async () => "" };
  }

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

export const useSetDefaultPaymentMethod = (): TSetDefaultPaymentMethod => {
  const { currentProject } = useContext(Context);

  if (!currentProject?.billing_enabled) {
    return { setDefaultPaymentMethod: async () => { } };
  }

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

export const checkIfProjectHasPayment = (): TCheckHasPaymentEnabled => {
  const { currentProject } = useContext(Context);


  // Check if payment is enabled for the project
  const paymentEnabledReq = useQuery(
    ["checkPaymentEnabled", currentProject?.id],
    async (): Promise<boolean | null> => {
      if (!currentProject?.billing_enabled) {
        return null;
      }

      if (!currentProject?.id) {
        return null;
      }

      try {
        const res = await api.getHasBilling(
          "<token>",
          {},
          { project_id: currentProject.id }
        );

        const data = z.boolean().parse(res.data);
        return data;
      } catch (error) {
        return null
      }
    });

  return {
    hasPaymentEnabled: paymentEnabledReq.data ?? null,
    refetchPaymentEnabled: paymentEnabledReq.refetch,
  };
};
export const usePublishableKey = (): TGetPublishableKey => {
  const { currentProject } = useContext(Context);

  // Fetch list of payment methods
  const keyReq = useQuery(
    ["getPublishableKey", currentProject?.id],
    async (): Promise<string | null> => {
      if (!currentProject?.billing_enabled) {
        return null;
      }

      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }

      try {
        const res = await api.getPublishableKey(
          "<token>",
          {},
          {
            project_id: currentProject?.id,
          }
        );
        return res.data;
      } catch (error) {
        return null
      }
    });

  return {
    publishableKey: keyReq.data ?? null,
  };
};

export const usePorterCredits = (): TGetCredits => {
  const { currentProject } = useContext(Context);

  // Fetch available credits
  const creditsReq = useQuery(
    ["getPorterCredits", currentProject?.id],
    async (): Promise<CreditGrants | null> => {
      if (!currentProject?.metronome_enabled) {
        return null;
      }

      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }

      try {
        const res = await api.getPorterCredits(
          "<token>",
          {},
          {
            project_id: currentProject?.id,
          }
        );
        const creditGrants = CreditGrantsValidator.parse(res.data);
        return creditGrants;
      } catch (error) {
        return null
      }
    }
  );

  return {
    creditGrants: creditsReq.data ?? null,
  };
};

export const useCustomerPlan = (): TGetPlan => {
  const { currentProject } = useContext(Context);

  // Fetch current plan
  const planReq = useQuery(
    ["getCustomerPlan", currentProject?.id],
    async (): Promise<Plan | null> => {
      if (!currentProject?.metronome_enabled) {
        return null;
      }

      if (!currentProject?.id) {
        return null;
      }

      try {
        const res = await api.getCustomerPlan(
          "<token>",
          {},
          { project_id: currentProject.id }
        );

        const plan = PlanValidator.parse(res.data);
        return plan;
      } catch (error) {
        return null
      }
    });

  return {
    plan: planReq.data ?? null,
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
    async (): Promise<UsageList | null> => {
      if (!currentProject?.metronome_enabled) {
        return null;
      }

      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }

      try {
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
      } catch (error) {
        return null;
      }
    });

  return {
    usage: usageReq.data ?? null,
  };
};

export const useReferralDetails = (): TGetReferralDetails => {
  const { currentProject } = useContext(Context);

  // Fetch user's referral code
  const referralsReq = useQuery(
    ["getReferralDetails", currentProject?.id],
    async (): Promise<ReferralDetails | null> => {
      if (!currentProject?.metronome_enabled) {
        return null;
      }

      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }

      try {
        const res = await api.getReferralDetails(
          "<token>",
          {},
          { project_id: currentProject?.id }
        );

        const referraldetails = ReferralDetailsValidator.parse(res.data);
        return referraldetails;
      } catch (error) {
        return null
      }
    });

  return {
    referralDetails: referralsReq.data ?? null,
  };
};
