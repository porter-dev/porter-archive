import React, { Component } from "react";
import { Route, RouteComponentProps, Switch, withRouter } from "react-router";

import { integrationList } from "shared/common";
import styled from "styled-components";

import CreateIntegrationForm from "./create-integration/CreateIntegrationForm";
import IntegrationCategories from "./IntegrationCategories";
import IntegrationList from "./IntegrationList";

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
              this.props.history.push("/integrations");
            }
            let icon =
              integrationList[integration] && integrationList[integration].icon;
            return (
              <div>
                <TitleSectionAlt>
                  <Flex>
                    <i
                      className="material-icons"
                      onClick={() =>
                        this.props.history.push(`/integrations/${category}`)
                      }
                    >
                      keyboard_backspace
                    </i>
                    <Icon src={icon && icon} />
                    <Title>{integrationList[integration].label}</Title>
                  </Flex>
                </TitleSectionAlt>
                <CreateIntegrationForm
                  integrationName={integration}
                  closeForm={() => {
                    this.props.history.push(`/integrations/${category}`);
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
              this.props.history.push("/integrations");
            }
            return (
              <IntegrationCategories
                category={currentCategory}
              ></IntegrationCategories>
            );
          }}
        />
        <Route>
          <div>
            <TitleSection>
              <Title>Integrations</Title>
            </TitleSection>

            <IntegrationList
              currentCategory={""}
              integrations={["kubernetes", "registry", "repo"]}
              setCurrent={(x) => this.props.history.push(`/integrations/${x}`)}
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

const Title = styled.div`
  font-size: 24px;
  font-weight: 600;
  font-family: "Work Sans", sans-serif;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TitleSection = styled.div`
  margin-bottom: 20px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  height: 40px;
`;

const TitleSectionAlt = styled(TitleSection)`
  margin-left: -42px;
  width: calc(100% + 42px);
`;

const StyledIntegrations = styled.div`
  width: calc(90% - 150px);
  min-width: 300px;
  padding-top: 75px;
`;
