import React, { Component } from "react";
import { Route, RouteComponentProps, Switch, withRouter } from "react-router";

import { integrationList } from "shared/common";
import styled from "styled-components";
import { pushFiltered } from "shared/routing";

import CreateIntegrationForm from "./create-integration/CreateIntegrationForm";
import IntegrationCategories from "./IntegrationCategories";
import IntegrationList from "./IntegrationList";
import TitleSection from "components/TitleSection";

type PropsType = RouteComponentProps;

const IntegrationCategoryStrings = ["registry", "slack"]; /*"kubernetes",*/

const Integrations: React.FC<PropsType> = (props) => {
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
            let icon =
              integrationList[integration] && integrationList[integration].icon;
            return (
              <Flex>
                <TitleSection
                  handleNavBack={() =>
                    pushFiltered(props, `/integrations/${category}`, [
                      "project_id",
                    ])
                  }
                  icon={icon}
                >
                    {integrationList[integration].label}
                </TitleSection>
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
          <div>
            <TitleSection>Integrations</TitleSection>

            <IntegrationList
              currentCategory={""}
              integrations={["registry", "slack"]}
              setCurrent={(x) =>
                pushFiltered(props, `/integrations/${x}`, ["project_id"])
              }
              isCategory={true}
              updateIntegrationList={() => {}}
            />
          </div>
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
  display: flex;
  align-items: center;

  > i {
    cursor: pointer;
    font-size 24px;
    color: #969Fbbaa;
    padding: 3px;
    margin-right: 11px;
    border-radius: 100px;
    :hover {
      background: #ffffff11;
    }
  }
`;

const TitleSectionAlt = styled(TitleSection)`
  margin-left: -42px;
  width: calc(100% + 42px);
`;

const StyledIntegrations = styled.div`
  width: 83%;
  min-width: 300px;
`;
