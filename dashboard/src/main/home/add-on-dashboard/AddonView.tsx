import React, { useContext, useMemo } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";

import { Context } from "shared/Context";

import { AddonContextProvider } from "./AddonContextProvider";
import AddonFormContextProvider from "./AddonFormContextProvider";
import AddonHeader from "./AddonHeader";
import AddonTabs from "./AddonTabs";

type Props = RouteComponentProps;

const AddonView: React.FC<Props> = ({ match }) => {
  const { currentProject } = useContext(Context);
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
