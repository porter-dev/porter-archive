import { useContext, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  ClientSecretResponse,
  PaymentMethodValidator,
  type PaymentMethod,
  type PaymentMethodList,
} from "legacy/lib/billing/types";
import api from "legacy/shared/api";
import { z } from "zod";

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
        return null;
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
    return { setDefaultPaymentMethod: async () => {} };
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
        return null;
      }
    }
  );

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
        return null;
      }
    }
  );

  return {
    publishableKey: keyReq.data ?? null,
  };
};
