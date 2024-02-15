import React, { useContext, useMemo } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";

import { Context } from "shared/Context";

import ClusterContextProvider from "./ClusterContextProvider";
import ClusterFormContextProvider from "./ClusterFormContextProvider";
import ClusterHeader from "./ClusterHeader";
import ClusterTabs from "./ClusterTabs";

type Props = RouteComponentProps;

const ClusterView: React.FC<Props> = ({ match }) => {
  const { currentProject } = useContext(Context);
  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        tab: z.string().optional(),
        clusterId: z.string().optional(),
      })
      .safeParse(params);

    if (!validParams.success || !validParams.data.clusterId) {
      return {
        tab: undefined,
      };
    }
    const clusterId = parseInt(validParams.data.clusterId);
    return {
      tab: validParams.data.tab,
      clusterId,
    };
  }, [match]);
  return (
    <ClusterContextProvider clusterId={params.clusterId}>
      <ClusterFormContextProvider projectId={currentProject?.id}>
        <StyledExpandedCluster>
          <Back to="/infrastructure" />
          <ClusterHeader />
          <Spacer y={1} />
          <ClusterTabs tabParam={params.tab} />
        </StyledExpandedCluster>
      </ClusterFormContextProvider>
    </ClusterContextProvider>
  );
};

export default withRouter(ClusterView);

const StyledExpandedCluster = styled.div`
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
