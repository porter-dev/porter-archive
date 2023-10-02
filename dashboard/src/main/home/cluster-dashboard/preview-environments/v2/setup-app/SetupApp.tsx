import React, { useContext, useMemo } from "react";
import { RouteComponentProps, withRouter } from "react-router";
import styled from "styled-components";

import pull_request from "assets/pull_request_icon.svg";

import Back from "components/porter/Back";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import Spacer from "components/porter/Spacer";
import AppTemplateForm from "./AppTemplateForm";
import { LatestRevisionProvider } from "main/home/app-dashboard/app-view/LatestRevisionContext";

type Props = RouteComponentProps & {};

const SetupApp: React.FC<Props> = ({ location }) => {
  const params = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    const appName = queryParams.get("app_name");

    return {
      appName,
    };
  }, [location.search]);

  const appName = params.appName;

  if (!appName) {
    return null;
  }

  return (
    <LatestRevisionProvider appName={appName}>
      <CenterWrapper>
        <Div>
          <StyledConfigureTemplate>
            <Back to="/preview-environments" />
            <DashboardHeader
              prefix={<Icon src={pull_request} />}
              title={`Preview environments for ${appName}`}
              description="Set preview environment specific configuration for this application below. Any newly created preview environments will use these settings."
              capitalize={false}
              disableLineBreak
            />
            <DarkMatter />
            <AppTemplateForm />
            <Spacer y={3} />
          </StyledConfigureTemplate>
        </Div>
      </CenterWrapper>
    </LatestRevisionProvider>
  );
};

export default withRouter(SetupApp);

const Div = styled.div`
  width: 100%;
  max-width: 900px;
`;

const CenterWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DarkMatter = styled.div`
  width: 100%;
  margin-top: -5px;
`;

const StyledConfigureTemplate = styled.div`
  height: 100%;
`;

const Icon = styled.img`
  margin-right: 15px;
  height: 28px;
  animation: floatIn 0.5s;
  animation-fill-mode: forwards;
  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0px);
    }
  }
`;
