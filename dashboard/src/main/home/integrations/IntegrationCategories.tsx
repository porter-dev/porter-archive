import React, { useEffect, useContext, useState } from "react";
import styled from "styled-components";
import GHIcon from "assets/GithubIcon";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import { RouteComponentProps, withRouter } from "react-router";
import IntegrationList from "./IntegrationList";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import Loading from "../../../components/Loading";

type Props = RouteComponentProps & {
  category: string;
};

const IntegrationCategories: React.FC<Props> = (props) => {
  const [currentOptions, setCurrentOptions] = useState([]);
  const [currentTitles, setCurrentTitles] = useState([]);
  const [currentIds, setCurrentIds] = useState([]);
  const [currentIntegrationData, setCurrentIntegrationData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [slackData, setSlackData] = useState([]);

  const { currentProject, setCurrentModal } = useContext(Context);

  const getIntegrationsForCategory = (categoryType: string) => {
    setLoading(true);
    setCurrentOptions([]);
    setCurrentTitles([]);
    setCurrentIntegrationData([]);

    switch (categoryType) {
      case "kubernetes":
        api
          .getProjectClusters("<token>", {}, { id: currentProject.id })
          .then()
          .catch(console.log);
        break;
      case "registry":
        api
          .getProjectRegistries("<token>", {}, { id: currentProject.id })
          .then((res) => {
            // Sort res.data into service type and sort each service's registry alphabetically
            let grouped: any = {};
            let final: any = [];
            for (let i = 0; i < res.data.length; i++) {
              let p = res.data[i].service;
              if (!grouped[p]) {
                grouped[p] = [];
              }
              grouped[p].push(res.data[i]);
            }
            Object.values(grouped).forEach((val: any) => {
              final = final.concat(
                val.sort((a: any, b: any) => (a.name > b.name ? 1 : -1))
              );
            });
            let newCurrentOptions = [] as string[];
            let newCurrentTitles = [] as string[];
            final.forEach((integration: any, i: number) => {
              newCurrentOptions.push(integration.service);
              newCurrentTitles.push(integration.name);
            });
            setCurrentOptions(newCurrentOptions);
            setCurrentTitles(newCurrentTitles);
            setCurrentIntegrationData(final);
            setLoading(false);
          })
          .catch(console.log);
        break;
      case "slack":
        api
          .getSlackIntegrations("<token>", {}, { id: currentProject.id })
          .then((res) => {
            setSlackData(res.data);
            setLoading(false);
          })
          .catch(console.log);
        break;
      default:
        console.log("Unknown integration category.");
    }
  };

  useEffect(() => {
    getIntegrationsForCategory(props.category);
  }, [props.category]);

  const { category: currentCategory } = props;
  const icon =
    integrationList[currentCategory] && integrationList[currentCategory].icon;
  const label =
    integrationList[currentCategory] && integrationList[currentCategory].label;
  const buttonText =
    integrationList[currentCategory] &&
    integrationList[currentCategory].buttonText;

  return (
    <div>
      <TitleSectionAlt>
        <Flex>
          <i
            className="material-icons"
            onClick={() => pushFiltered(props, "/integrations", ["project_id"])}
          >
            keyboard_backspace
          </i>
          <Icon src={icon && icon} />
          <Title>{label}</Title>
        </Flex>
        <Button
          onClick={() => {
            if (props.category != "slack") {
              setCurrentModal("IntegrationsModal", {
                category: currentCategory,
                setCurrentIntegration: (x: string) =>
                  pushFiltered(
                    props,
                    `/integrations/${props.category}/create/${x}`,
                    ["project_id"]
                  ),
              });
            } else {
              window.location.href = `/api/oauth/projects/${currentProject.id}/slack`;
            }
          }}
        >
          <i className="material-icons">add</i>
          {buttonText}
        </Button>
      </TitleSectionAlt>

      <LineBreak />

      {loading ? (
        <Loading />
      ) : props.category == "slack" ? (
        <StyledIntegrationList>
          {slackData.map((inst) => {
            return (
              <Integration
                onClick={() => {}}
                disabled={false}
                key={`${inst.team_id}-{inst.channel}`}
              >
                <MainRow disabled={false}>
                  <Flex>
                    <Icon src={inst.team_icon_url && inst.team_icon_url} />
                    <Label>
                      {inst.team_id} - {inst.channel}
                    </Label>
                  </Flex>
                </MainRow>
              </Integration>
            );
          })}
        </StyledIntegrationList>
      ) : (
        <IntegrationList
          currentCategory={props.category}
          integrations={currentOptions}
          titles={currentTitles}
          itemIdentifier={currentIntegrationData}
          updateIntegrationList={() =>
            getIntegrationsForCategory(props.category)
          }
        />
      )}
    </div>
  );
};

export default withRouter(IntegrationCategories);

const Label = styled.div`
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
`;

const MainRow = styled.div`
  height: 70px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 25px;
  border-radius: 5px;
  :hover {
    background: ${(props: { disabled: boolean }) =>
      props.disabled ? "" : "#ffffff11"};
    > i {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }

  > i {
    border-radius: 20px;
    font-size: 18px;
    padding: 5px;
    color: #ffffff44;
    margin-right: -7px;
    :hover {
      background: ${(props: { disabled: boolean }) =>
        props.disabled ? "" : "#ffffff11"};
    }
  }
`;

const Integration = styled.div`
  margin-left: -2px;
  display: flex;
  flex-direction: column;
  background: #26282f;
  cursor: ${(props: { disabled: boolean }) =>
    props.disabled ? "not-allowed" : "pointer"};
  margin-bottom: 15px;
  border-radius: 5px;
  box-shadow: 0 5px 8px 0px #00000033;
`;

const StyledIntegrationList = styled.div`
  margin-top: 20px;
  margin-bottom: 80px;
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

const Button = styled.div`
  height: 100%;
  background: #616feecc;
  :hover {
    background: #505edddd;
  }
  color: white;
  font-weight: 500;
  font-size: 13px;
  padding: 10px 15px;
  border-radius: 3px;
  cursor: pointer;
  box-shadow: 0 5px 8px 0px #00000010;
  display: flex;
  flex-direction: row;
  align-items: center;

  > img,
  i {
    width: 20px;
    height: 20px;
    font-size: 16px;
    display: flex;
    align-items: center;
    margin-right: 10px;
    justify-content: center;
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

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin: 32px 0px 24px;
`;
