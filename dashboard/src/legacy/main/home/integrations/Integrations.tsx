import React, { useContext, useMemo } from "react";
import integrationGrad from "legacy/assets/integration-grad.svg";
import Spacer from "legacy/components/porter/Spacer";
import TitleSection from "legacy/components/TitleSection";
import { integrationList } from "legacy/shared/common";
import { pushFiltered } from "legacy/shared/routing";
import {
  Route,
  Switch,
  withRouter,
  type RouteComponentProps,
} from "react-router";
import styled from "styled-components";

import { Context } from "shared/Context";

import DashboardHeader from "../cluster-dashboard/DashboardHeader";
import CreateIntegrationForm from "./create-integration/CreateIntegrationForm";
import IntegrationCategories from "./IntegrationCategories";
import IntegrationList from "./IntegrationList";

type PropsType = RouteComponentProps;

const Integrations: React.FC<PropsType> = (props) => {
  const { enableGitlab, currentProject } = useContext(Context);

  const IntegrationCategoryStrings = useMemo(() => {
    if (!enableGitlab) {
      return currentProject?.infisical_enabled
        ? ["slack", "doppler", "infisical"]
        : ["slack", "doppler"];
    }

    return currentProject?.infisical_enabled
      ? ["slack", "doppler", "infisical", "gitlab"]
      : ["slack", "doppler", "gitlab"];
  }, [enableGitlab, currentProject]);

  return (
    <StyledIntegrations>
      <Switch>
        <Route
          path="/integrations/:category/create/:integration"
          render={(rp) => {
            const { integration, category } = rp.match.params;
            if (!IntegrationCategoryStrings.includes(category)) {
              pushFiltered(props, "/integrations", ["project_id"]);
            }
            const icon = integrationList[integration]?.icon;
            return (
              <Flex>
                <TitleSection
                  handleNavBack={() => {
                    pushFiltered(props, `/integrations/${category}`, [
                      "project_id",
                    ]);
                  }}
                  icon={icon}
                >
                  {integrationList[integration].label}
                </TitleSection>
                <Spacer y={1} />
                <CreateIntegrationForm
                  integrationName={integration}
                  closeForm={() => {
                    pushFiltered(props, `/integrations/${category}`, [
                      "project_id",
                    ]);
                  }}
                />
                <Br />
              </Flex>
            );
          }}
        />
        <Route
          path="/integrations/:category"
          render={(rp) => {
            const currentCategory = rp.match.params.category;
            if (!IntegrationCategoryStrings.includes(currentCategory)) {
              pushFiltered(props, "/integrations", ["project_id"]);
            }
            return <IntegrationCategories category={currentCategory} />;
          }}
        />
        <Route>
          <>
            <DashboardHeader
              image={integrationGrad}
              title="Integrations"
              description="Manage third-party integrations for your Porter project."
              disableLineBreak
            />
            <IntegrationList
              currentCategory={""}
              integrations={IntegrationCategoryStrings}
              setCurrent={(x) => {
                pushFiltered(props, `/integrations/${x}`, ["project_id"]);
              }}
              isCategory={true}
              updateIntegrationList={() => {}}
            />
          </>
        </Route>
      </Switch>
    </StyledIntegrations>
  );
};

export default withRouter(Integrations);

const Buffer = styled.div`
  width: 100%;
  height: 10px;
`;

const Br = styled.div`
  width: 100%;
  height: 150px;
`;

const Icon = styled.img`
  width: 27px;
  margin-right: 12px;
  margin-bottom: -1px;
`;

const Flex = styled.div`
  width: 100%;

  > i {
    cursor: pointer;
    font-size: 24px;
    color: #969fbbaa;
    padding: 3px;
    margin-right: 11px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const StyledIntegrations = styled.div`
  width: 100%;
  min-width: 300px;
`;
