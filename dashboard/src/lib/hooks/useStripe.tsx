import { useContext, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  ClientSecretResponse,
  PaymentMethodList,
  PaymentMethodValidator,
} from "lib/billing/types";

import api from "shared/api";
import { Context } from "shared/Context";

type TUsePaymentMethod = {
  paymentMethodList: PaymentMethodList;
  refetchPaymentMethods: any;
  isDeleting: boolean;
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

export const usePaymentMethods = (): TUsePaymentMethod => {
  const { currentProject } = useContext(Context);

  // State has be shared so that payment methods can be removed
  // from the Billing page once they are deleted
  const [paymentMethodList, setPaymentMethodList] = useState<PaymentMethodList>(
    []
  );
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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
    setIsDeleting(true);

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
    setIsDeleting(false);
  };

  return {
    paymentMethodList,
    refetchPaymentMethods: paymentMethodReq.refetch,
    isDeleting,
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

export const usePublishableKey = (): TGetPublishableKey => {
  const { user, currentProject } = useContext(Context);

  // Fetch list of payment methods
  const keyReq = useQuery(["getKey", currentProject?.id], async () => {
    if (!currentProject?.id || currentProject.id === -1) {
      return;
    }
    const res = await api.checkBillingCustomerExists(
      "<token>",
      { user_email: user?.email },
      { project_id: currentProject?.id }
    );
    return res.data;
  });

  return {
    publishableKey: keyReq.data,
  };
};

export const checkBillingCustomerExists = async (): Promise<void> => {
  const { user, currentProject } = useContext(Context);
  const res = await api.checkBillingCustomerExists(
    "<token>",
    { user_email: user?.email },
    {
      project_id: currentProject?.id,
    }
  );

  if (res.status !== 200) {
    throw Error("failed to check if billing customer exists");
  }
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
