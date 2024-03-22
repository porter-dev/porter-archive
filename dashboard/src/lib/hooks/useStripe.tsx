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

type TCreatePaymentMethod = {
  createPaymentMethod: () => Promise<string>;
};

type TDeletePaymentMethod = {
  deletePaymentMethod: (paymentMethodId: string) => Promise<void>;
  isDeleting: boolean;
};

export const usePaymentMethodList = (): PaymentMethodList => {
  const { user, currentProject } = useContext(Context);
  const clusterReq = useQuery(
    ["getPaymentMethods", currentProject?.id],
    async () => {
      if (!currentProject?.id || currentProject.id === -1) {
        return;
      }
      await api.checkBillingCustomerExists(
        "<token>",
        { user_email: user?.email },
        { project_id: currentProject?.id }
      );
      const listResponse = await api.listPaymentMethod(
        "<token>",
        {},
        { project_id: currentProject?.id }
      );
      const paymentMethodList = await z
        .array(PaymentMethodValidator)
        .parseAsync(listResponse.data);
      return paymentMethodList;
    },
    {
      refetchInterval: 3000,
    }
  );

  return {
    paymentMethods: clusterReq.data ?? [],
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

export const useDeletePaymentMethod = (): TDeletePaymentMethod => {
  const { currentProject } = useContext(Context);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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

    setIsDeleting(false);
  };

  return {
    deletePaymentMethod,
    isDeleting,
  };
};
