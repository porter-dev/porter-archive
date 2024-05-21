import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import { integrationList } from "shared/common";
import { type RouteComponentProps, withRouter } from "react-router";
import IntegrationList from "./IntegrationList";
import DopplerIntegrationList from "./DopplerIntegrationList";
import api from "shared/api";
import { pushFiltered } from "shared/routing";
import Loading from "../../../components/Loading";
import SlackIntegrationList from "./SlackIntegrationList";
import TitleSection from "components/TitleSection";
import GitlabIntegrationList from "./GitlabIntegrationList";
import leftArrow from "assets/left-arrow.svg";
import Spacer from "components/porter/Spacer";
import InfisicalIntegrationList from "./infisical/InfisicalIntegrationList";

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
  const [gitlabData, setGitlabData] = useState([]);

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
            const grouped: any = {};
            let final: any = [];
            for (let i = 0; i < res.data.length; i++) {
              const p = res.data[i].service;
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
            const newCurrentOptions = [] as string[];
            const newCurrentTitles = [] as string[];
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
      case "gitlab":
        api
          .getGitlabIntegration(
            "<token>",
            {},
            { project_id: currentProject.id }
          )
          .then((res) => {
            setGitlabData(res.data);
            setLoading(false);
          });
        break;
      default:
        console.log("Unknown integration category.");
    }
  };

  useEffect(() => {
    getIntegrationsForCategory(props.category);
    if (props.category === "doppler" || props.category === "infisical") {
      setLoading(false);
    }
  }, [props.category]);

  const { category: currentCategory } = props;
  const icon =
    integrationList[currentCategory]?.icon;
  const label =
    integrationList[currentCategory]?.label;
  const buttonText =
    integrationList[currentCategory]?.buttonText;

  return (
    <>
      <BreadcrumbRow>
        <Breadcrumb
          onClick={() => { pushFiltered(props, "/integrations", ["project_id"]); }}
        >
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <Flex>
        <TitleSection icon={icon} iconWidth="32px">
          {label}
        </TitleSection>
        {props.category === "doppler" || props.category === "infisical" ? null : (
          <Button
            onClick={() => {
              if (props.category === "gitlab") {
                pushFiltered(props, `/integrations/gitlab/create/gitlab`, [
                  "project_id",
                ]);
              } else if (props.category === "doppler" || props.category === "infisical") {
                // ret2
              } else if (props.category !== "slack") {
                setCurrentModal("IntegrationsModal", {
                  category: currentCategory,
                  setCurrentIntegration: (x: string) => {
                    pushFiltered(
                      props,
                      `/integrations/${props.category}/create/${x}`,
                      ["project_id"]
                    )
                  }
                });
              } else {
                window.location.href = `/api/projects/${currentProject.id}/oauth/slack`;
              }
            }}
          >
            <i className="material-icons">add</i>
            {buttonText}
          </Button>
        )}
      </Flex>
      <Spacer y={1} />
      {loading ? (
        <Loading />
      ) : props.category === "gitlab" ? (
        <GitlabIntegrationList
          gitlabData={gitlabData}
          updateIntegrationList={() =>
            { getIntegrationsForCategory(props.category); }
          }
        />
      ) : props.category === "slack" ? (
        <SlackIntegrationList slackData={slackData} />
      ) : props.category === "doppler" ? (
        <DopplerIntegrationList />
      ) : props.category === "infisical" && currentProject?.infisical_enabled ? (
        <InfisicalIntegrationList />
      ) : (
        <IntegrationList
          currentCategory={props.category}
          integrations={currentOptions}
          titles={currentTitles}
          itemIdentifier={currentIntegrationData}
          updateIntegrationList={() =>
            { getIntegrationsForCategory(props.category); }
          }
        />
      )}
    </>
  );
};

export default withRouter(IntegrationCategories);

const Wrap = styled.div`
  z-index: 999;
`;

const ArrowIcon = styled.img`
  width: 15px;
  margin-right: 8px;
  opacity: 50%;
`;

const BreadcrumbRow = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-start;
`;

const Breadcrumb = styled.div`
  color: #aaaabb88;
  font-size: 13px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  margin-top: -10px;
  z-index: 999;
  padding: 5px;
  padding-right: 7px;
  border-radius: 5px;
  cursor: pointer;
  :hover {
    background: #ffffff11;
  }
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

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

const Button = styled.div`
  height: 100%;
  margin-top: -12px;
  background: #616feecc;
  :hover {
    background: #505edddd;
  }
  color: white;
  height: 35px;
  font-weight: 500;
  font-size: 13px;
  padding: 7px 7px;
  padding-right: 12px;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  align-items: center;

  > img,
  i {
    width: 20px;
    height: 20px;
    font-size: 15px;
    display: flex;
    align-items: center;
    margin-right: 5px;
    justify-content: center;
  }
`;
