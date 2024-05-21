import React from "react";
import { useQuery } from "@tanstack/react-query";
import Loading from "legacy/components/Loading";
import {
  StyledTable,
  StyledTd,
  StyledTh,
  StyledTHead,
  StyledTr,
} from "legacy/components/OldTable";
import ClickToCopy from "legacy/components/porter/ClickToCopy";
import { Error as ErrorComponent } from "legacy/components/porter/Error";
import Spacer from "legacy/components/porter/Spacer";
import Text from "legacy/components/porter/Text";
import {
  tailscaleServiceValidator,
  type ClientTailscaleService,
} from "legacy/lib/addons";
import api from "legacy/shared/api";
import { match } from "ts-pattern";
import { z } from "zod";

import { useAddonContext } from "../AddonContextProvider";

const TailscaleOverview: React.FC = () => {
  const { projectId, deploymentTarget } = useAddonContext();

  const tailscaleServicesResp = useQuery<ClientTailscaleService[]>(
    ["getTailscaleServices", projectId, deploymentTarget],
    async () => {
      if (!projectId || projectId === -1) {
        return [];
      }

      const res = await api.getTailscaleServices(
        "<token>",
        {},
        {
          projectId,
          deploymentTargetId: deploymentTarget.id,
        }
      );

      const parsed = await z
        .object({
          services: z.array(tailscaleServiceValidator).optional().default([]),
        })
        .parseAsync(res.data);

      return parsed.services;
    },
    {
      enabled: !!projectId && projectId !== -1,
      retryDelay: 5000,
    }
  );

  return (
    <div>
      <Text size={16}>Networking</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        Please make sure that you{" "}
        <a
          href="https://docs.porter.run/other/tailscale#adding-routes-to-your-tailnet"
          target="_blank"
          rel="noreferrer"
        >
          approve all advertised subnet routes in Tailscale.
        </a>{" "}
        Once that is completed, the following services can be reached through
        your Tailscale VPN by IP:
      </Text>
      <Spacer y={0.5} />
      {match(tailscaleServicesResp)
        .with({ status: "loading" }, () => <Loading />)
        .with({ status: "error" }, ({ error }) => (
          <ErrorComponent message={(error as Error).message} />
        ))
        .with({ status: "success", data: [] }, () => (
          <Text>No services found</Text>
        ))
        .with({ status: "success" }, ({ data }) => (
          <StyledTable>
            <StyledTHead>
              <StyledTr>
                <StyledTh>Name</StyledTh>
                <StyledTh>IP</StyledTh>
                <StyledTh>Port</StyledTh>
              </StyledTr>
            </StyledTHead>
            <tbody>
              {data.map((service) => (
                <StyledTr key={service.name}>
                  <StyledTd>
                    <ClickToCopy>{service.name}</ClickToCopy>
                  </StyledTd>
                  <StyledTd>
                    <ClickToCopy>{service.ip}</ClickToCopy>
                  </StyledTd>
                  <StyledTd>
                    <ClickToCopy>{service.port}</ClickToCopy>
                  </StyledTd>
                </StyledTr>
              ))}
            </tbody>
          </StyledTable>
        ))
        .exhaustive()}
    </div>
  );
};

export default TailscaleOverview;
