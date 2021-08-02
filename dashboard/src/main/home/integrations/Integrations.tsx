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

type StateType = {
  currentIntegrationData: any[];
};

const IntegrationCategoryStrings = ["registry", "repo"]; /*"kubernetes",*/

class Integrations extends Component<PropsType, StateType> {
  state = {
    currentIntegrationData: [] as any[],
  };

  render = () => (
    <StyledIntegrations>
      <Switch>
        <Route
          path="/integrations/:category/create/:integration"
          render={(rp) => {
            const { integration, category } = rp.match.params;
            if (!IntegrationCategoryStrings.includes(category)) {
              pushFiltered(this.props, "/integrations", ["project_id"]);
            }
            let icon =
              integrationList[integration] && integrationList[integration].icon;
            return (
              <div>
                <TitleSection
                  icon={icon}
                  handleNavBack={() =>
                    pushFiltered(this.props, `/integrations/${category}`, [
                      "project_id",
                    ])
                  }
                >
                  {integrationList[integration].label}
                </TitleSection>
                <Buffer />
                <CreateIntegrationForm
                  integrationName={integration}
                  closeForm={() => {
                    pushFiltered(this.props, `/integrations/${category}`, [
                      "project_id",
                    ]);
                  }}
                />
                <Br />
              </div>
            );
          }}
        />
        <Route
          path="/integrations/:category"
          render={(rp) => {
            const currentCategory = rp.match.params.category;
            if (!IntegrationCategoryStrings.includes(currentCategory)) {
              pushFiltered(this.props, "/integrations", ["project_id"]);
            }
            return <IntegrationCategories category={currentCategory} />;
          }}
        />
        <Route>
          <div>
            <TitleSection>Integrations</TitleSection>

            <IntegrationList
              currentCategory={""}
              integrations={["kubernetes", "registry"]}
              setCurrent={(x) =>
                pushFiltered(this.props, `/integrations/${x}`, ["project_id"])
              }
              isCategory={true}
              updateIntegrationList={() => {}}
            />
          </div>
        </Route>
      </Switch>
    </StyledIntegrations>
  );
}

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
