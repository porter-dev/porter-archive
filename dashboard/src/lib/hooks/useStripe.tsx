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

export const usePaymentMethods = (): TUsePaymentMethod => {
  const { user, currentProject } = useContext(Context);

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
