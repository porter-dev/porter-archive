import React, { useContext, useMemo } from "react";
import Back from "legacy/components/porter/Back";
import Spacer from "legacy/components/porter/Spacer";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import { Context } from "shared/Context";

import ClusterContextProvider from "../infrastructure-dashboard/ClusterContextProvider";
import { AddonContextProvider } from "./AddonContextProvider";
import AddonFormContextProvider from "./AddonFormContextProvider";
import AddonHeader from "./AddonHeader";
import AddonTabs from "./AddonTabs";

type Props = RouteComponentProps;

const AddonView: React.FC<Props> = ({ match }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        tab: z.string().optional(),
        addonName: z.string().optional(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        tab: undefined,
      };
    }

    return validParams.data;
  }, [match]);

  return (
    <ClusterContextProvider clusterId={currentCluster?.id} refetchInterval={0}>
      <AddonContextProvider addonName={params.addonName}>
        <AddonFormContextProvider projectId={currentProject?.id}>
          <StyledExpandedAddon>
            <Back to="/addons" />
            <AddonHeader />
            <Spacer y={1} />
            <AddonTabs tabParam={params.tab} />
          </StyledExpandedAddon>
        </AddonFormContextProvider>
      </AddonContextProvider>
    </ClusterContextProvider>
  );
};

export default withRouter(AddonView);

const StyledExpandedAddon = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
