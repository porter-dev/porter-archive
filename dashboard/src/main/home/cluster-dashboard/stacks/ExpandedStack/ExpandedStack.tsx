import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import TabSelector from "components/TabSelector";
import TitleSection from "components/TitleSection";
import React, { useContext, useState } from "react";
import leftArrow from "assets/left-arrow.svg";
import { useParams, useRouteMatch } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import ChartList from "../../chart/ChartList";
import Status from "../components/Status";
import {
  Action,
  Br,
  InfoWrapper,
  LastDeployed,
  NamespaceTag,
  SepDot,
  Text,
} from "../components/styles";
import { getStackStatus, getStackStatusMessage } from "../shared";
import { FullStackRevision, Stack, StackRevision } from "../types";
import EnvGroups from "./components/EnvGroups";
import RevisionList from "./_RevisionList";
import SourceConfig from "./_SourceConfig";
import { NavLink } from "react-router-dom";
import Settings from "./components/Settings";
import { ExpandedStackStore } from "./Store";
import DynamicLink from "components/DynamicLink";

const ExpandedStack = () => {
  const { namespace } = useParams<{
    namespace: string;
    stack_id: string;
  }>();

  const { stack, refreshStack } = useContext(ExpandedStackStore);

  const { pushFiltered } = useRouting();

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const { url } = useRouteMatch();

  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTab, setCurrentTab] = useState("apps");

  const [currentRevision, setCurrentRevision] = useState<FullStackRevision>(
    () => stack.latest_revision
  );

  const handleDelete = () => {
    setIsDeleting(true);
    api
      .deleteStack(
        "<token>",
        {},
        {
          namespace,
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          stack_id: stack.id,
        }
      )
      .then(() => {
        pushFiltered("/stacks", []);
      })
      .catch((err) => {
        setCurrentError(err);
        setIsDeleting(false);
      });
  };

  if (stack === null) {
    return null;
  }

  if (isDeleting) {
    return (
      <Placeholder height="400px">
        <div>
          <h1>Deleting Stack</h1>
          <p>This may take some time...</p>
          <Loading />
        </div>
      </Placeholder>
    );
  }

  return (
    <div>
      <BreadcrumbRow>
        <Breadcrumb to="/stacks">
          <ArrowIcon src={leftArrow} />
          <Wrap>Back</Wrap>
        </Breadcrumb>
      </BreadcrumbRow>
      <StackTitleWrapper>
        <TitleSection materialIconClass="material-icons-outlined" icon={"lan"}>
          {stack.name}
        </TitleSection>
        <NamespaceTag.Wrapper>
          Namespace
          <NamespaceTag.Tag>{stack.namespace}</NamespaceTag.Tag>
        </NamespaceTag.Wrapper>
      </StackTitleWrapper>

      {/* Stack error message */}
      {currentRevision &&
      currentRevision?.reason &&
      currentRevision?.message?.length > 0 ? (
        <StackErrorMessageStyles.Wrapper>
          <i className="material-icons">history</i>
          <StackErrorMessageStyles.Text color="#aaaabb">
            {currentRevision?.status === "failed" ? "Error: " : ""}
            {currentRevision?.message}
          </StackErrorMessageStyles.Text>
        </StackErrorMessageStyles.Wrapper>
      ) : null}

      <Break />
      <InfoWrapper>
        <LastDeployed>
          <Status
            status={getStackStatus(stack)}
            message={getStackStatusMessage(stack)}
          />
          <SepDot>•</SepDot>
          Last updated {readableDate(stack.updated_at)}
        </LastDeployed>
      </InfoWrapper>

      <RevisionList
        revisions={stack.revisions}
        currentRevision={currentRevision}
        latestRevision={stack.latest_revision}
        stackId={stack.id}
        stackNamespace={namespace}
        onRevisionClick={(revision) => setCurrentRevision(revision)}
        onRollback={() => refreshStack()}
      ></RevisionList>
      <Br />
      <TabSelector
        currentTab={currentTab}
        options={[
          {
            label: "Apps",
            value: "apps",
            component: (
              <>
                <Gap></Gap>
                <Action.Row>
                  <Action.Button to={`${url}/new-app-resource`}>
                    <i className="material-icons">add</i>
                    Create app resource
                  </Action.Button>
                </Action.Row>
                {currentRevision.id !== stack.latest_revision.id ? (
                  <ChartListWrapper>
                    <Placeholder>
                      Not available when previewing revisions
                    </Placeholder>
                  </ChartListWrapper>
                ) : (
                  <ChartListWrapper>
                    <ChartList
                      currentCluster={currentCluster}
                      currentView="stacks"
                      namespace={namespace}
                      sortType="Alphabetical"
                      appFilters={
                        stack?.latest_revision?.resources?.map(
                          (res) => res.name
                        ) || []
                      }
                      closeChartRedirectUrl={`${window.location.pathname}${window.location.search}`}
                    />
                  </ChartListWrapper>
                )}
              </>
            ),
          },
          {
            label: "Source config",
            value: "source_config",
            component: (
              <>
                <SourceConfig
                  namespace={namespace}
                  revision={currentRevision}
                  readOnly={stack.latest_revision.id !== currentRevision.id}
                  onSourceConfigUpdate={() => refreshStack()}
                ></SourceConfig>
              </>
            ),
          },
          {
            label: "Env groups",
            value: "env_groups",
            component: (
              <>
                <Gap></Gap>
                <Action.Row>
                  <Action.Button to={`${url}/new-env-group`}>
                    <i className="material-icons">add</i>
                    Create env group
                  </Action.Button>
                </Action.Row>
                <EnvGroups stack={stack} />
              </>
            ),
          },
          {
            label: "Settings",
            value: "settings",
            component: (
              <>
                <Gap></Gap>
                <Settings
                  stack={stack}
                  onDelete={handleDelete}
                  onUpdate={refreshStack}
                />
              </>
            ),
          },
        ]}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
        }}
      ></TabSelector>
      <PaddingBottom />
    </div>
  );
};

export default ExpandedStack;

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

const Breadcrumb = styled(DynamicLink)`
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

const Wrap = styled.div`
  z-index: 999;
`;

const PaddingBottom = styled.div`
  width: 100%;
  height: 150px;
`;

const Break = styled.div`
  width: 100%;
  height: 20px;
`;

const BackButton = styled(NavLink)`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const ChartListWrapper = styled.div`
  width: 100%;
  margin: auto;
  padding-bottom: 125px;
`;

const Gap = styled.div`
  width: 100%;
  background: none;
  height: 30px;
`;

const StackErrorMessageStyles = {
  Text: styled(Text)`
    font-size: 13px;
  `,
  Wrapper: styled.div`
    display: flex;
    align-items: center;

    margin-top: 5px;
    > i {
      color: #ffffff44;
      margin-right: 8px;
      font-size: 20px;
    }
  `,
  Title: styled(Text)`
    font-size: 16px;
    font-weight: bold;
  `,
};

const StackTitleWrapper = styled.div`
  width: 100%;
  display: flex;
  position: relative;
  align-items: center;

  // Hotfix to make sure the title section and the namespace tag are aligned
  ${NamespaceTag.Wrapper} {
    margin-left: 17px;
    margin-bottom: 13px;
  }
`;
