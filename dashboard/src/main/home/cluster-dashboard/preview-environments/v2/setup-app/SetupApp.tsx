import React, { useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { match } from "ts-pattern";

import Loading from "components/Loading";
import Back from "components/porter/Back";
import Spacer from "components/porter/Spacer";
import { LatestRevisionProvider } from "main/home/app-dashboard/app-view/LatestRevisionContext";
import DashboardHeader from "main/home/cluster-dashboard/DashboardHeader";
import ClusterContextProvider from "main/home/infrastructure-dashboard/ClusterContextProvider";

import api from "shared/api";
import { Context } from "shared/Context";
import pull_request from "assets/pull_request_icon.svg";

import { EnvTemplateContextProvider } from "../EnvTemplateContextProvider";
import { existingTemplateWithEnvValidator } from "../types";
import { CreateTemplate } from "./CreateTemplate";
import { PreviewAppDataContainer } from "./PreviewAppDataContainer";

type Props = RouteComponentProps;

const SetupApp: React.FC<Props> = ({ location }) => {
  const { currentCluster, currentProject } = useContext(Context);
  const params = useMemo(() => {
    const queryParams = new URLSearchParams(location.search);
    const appName = queryParams.get("app_name");

    return {
      appName,
    };
  }, [location.search]);

  const appName = params.appName;

  const templateRes = useQuery(
    ["getAppTemplate", currentProject?.id, currentCluster?.id, appName],
    async () => {
      if (
        !currentProject ||
        !currentCluster ||
        currentCluster.id === -1 ||
        currentProject.id === -1 ||
        !appName
      ) {
        return null;
      }

      try {
        const res = await api.getAppTemplate(
          "<token>",
          {},
          {
            project_id: currentProject?.id,
            cluster_id: currentCluster?.id,
            porter_app_name: appName,
          }
        );

        const template = await existingTemplateWithEnvValidator.parseAsync(
          res.data
        );

        return template;
      } catch (err) {
        return null;
      }
    },
    {
      enabled: !!currentProject && !!currentCluster && !!appName,
      refetchOnWindowFocus: false,
    }
  );

  if (!appName) {
    return (
      <ClusterContextProvider
        clusterId={currentCluster?.id}
        refetchInterval={0}
      >
        <CenterWrapper>
          <Div>
            <EnvTemplateContextProvider shouldShowGHAModal>
              <CreateTemplate />
            </EnvTemplateContextProvider>
          </Div>
        </CenterWrapper>
      </ClusterContextProvider>
    );
  }

  return (
    <ClusterContextProvider clusterId={currentCluster?.id} refetchInterval={0}>
      <EnvTemplateContextProvider>
        <LatestRevisionProvider appName={appName}>
          <CenterWrapper>
            <Div>
              <StyledConfigureTemplate>
                <Back to="/preview-environments" />
                <DashboardHeader
                  prefix={<Icon src={pull_request} />}
                  title={`Preview apps for ${appName}`}
                  description="Set preview specific configuration for this app below. Any newly created preview apps will use these settings."
                  capitalize={false}
                  disableLineBreak
                />
                <DarkMatter />
                {match(templateRes)
                  .with({ status: "loading" }, () => <Loading />)
                  .with({ status: "success" }, ({ data }) => {
                    return <PreviewAppDataContainer existingTemplate={data} />;
                  })
                  .otherwise(() => null)}
                <Spacer y={3} />
              </StyledConfigureTemplate>
            </Div>
          </CenterWrapper>
        </LatestRevisionProvider>
      </EnvTemplateContextProvider>
    </ClusterContextProvider>
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
