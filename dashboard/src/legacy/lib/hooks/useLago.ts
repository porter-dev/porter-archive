import { useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditGrantsValidator,
  InvoiceValidator,
  PlanValidator,
  ReferralDetailsValidator,
  UsageValidator,
  type CreditGrants,
  type InvoiceList,
  type Plan,
  type ReferralDetails,
  type Usage,
} from "legacy/lib/billing/types";
import api from "legacy/shared/api";

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
  usageList: Usage[] | null;
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
  previousPeriods: number,
  currentPeriod: boolean
): TGetUsage => {
  const { currentProject } = useContext(Context);

  // Fetch customer usage
  const usageReq = useQuery(
    ["listCustomerUsage", currentProject?.id, previousPeriods, currentPeriod],
    async (): Promise<Usage[] | null> => {
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
            previous_periods: previousPeriods,
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
    }
  );

  return {
    usageList: usageReq.data ?? null,
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
          {},
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
