import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  CostValidator,
  CreditGrantsValidator,
  InvoiceValidator,
  PlanValidator,
  ReferralDetailsValidator,
  UsageValidator,
  type CostList,
  type CreditGrants,
  type InvoiceList,
  type Plan,
  type ReferralDetails,
  type UsageList,
} from "lib/billing/types";

import api from "shared/api";
import { Context } from "shared/Context";

type TGetCredits = {
  creditGrants: CreditGrants | null;
};

type TGetPlan = {
  plan: Plan | null;
};

type TGetInvoices = {
  invoiceList: InvoiceList | null;
};

type TGetUsage = {
  usage: UsageList | null;
};

type TGetCosts = {
  costs: CostList | null;
};

type TGetReferralDetails = {
  referralDetails: ReferralDetails;
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
        return null;
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
        return null;
      }
    }
  );

  return {
    plan: planReq.data ?? null,
  };
};

export const useCustomerUsage = (
  startingOn: Date | null,
  endingBefore: Date | null,
  windowSize: string
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

      if (startingOn === null || endingBefore === null) {
        return null;
      }

      try {
        const res = await api.getCustomerUsage(
          "<token>",
          {
            starting_on: startingOn.toISOString(),
            ending_before: endingBefore.toISOString(),
            window_size: windowSize,
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
    }
  );

  return {
    usage: usageReq.data ?? null,
  };
};

export const useCustomerCosts = (
  startingOn: Date | null,
  endingBefore: Date | null,
  limit: number
): TGetCosts => {
  const { currentProject } = useContext(Context);

  // Fetch customer costs
  const usageReq = useQuery(
    ["listCustomerCosts", currentProject?.id],
    async (): Promise<CostList | null> => {
      if (!currentProject?.metronome_enabled) {
        return null;
      }

      if (!currentProject?.id || currentProject.id === -1) {
        return null;
      }

      if (startingOn === null || endingBefore === null) {
        return null;
      }

      try {
        const res = await api.getCustomerCosts(
          "<token>",
          {},
          {
            project_id: currentProject?.id,
            starting_on: startingOn.toISOString(),
            ending_before: endingBefore.toISOString(),
            limit,
          }
        );

        const costs = CostValidator.array().parse(res.data);
        return costs;
      } catch (error) {
        return null;
      }
    }
  );

  return {
    costs: usageReq.data ?? null,
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
        return null;
      }
    }
  );

  return {
    referralDetails: referralsReq.data ?? null,
  };
};

export const useCustomerInvoices = (): TGetInvoices => {
  const { currentProject } = useContext(Context);

  // Fetch customer invoices
  const invoicesReq = useQuery(
    ["getCustomerInvoices", currentProject?.id],
    async (): Promise<InvoiceList | null> => {
      if (!currentProject?.metronome_enabled) {
        return null;
      }

      if (!currentProject?.id) {
        return null;
      }

      try {
        const res = await api.getCustomerInvoices(
          "<token>",
          {
            status: "paid",
          },
          { project_id: currentProject.id }
        );

        const invoices = InvoiceValidator.array().parse(res.data);
        return invoices;
      } catch (error) {
        return null;
      }
    }
  );

  return {
    invoiceList: invoicesReq.data ?? null,
  };
};
