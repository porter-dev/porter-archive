import Loading from "components/Loading";
import Placeholder from "components/Placeholder";
import TabSelector from "components/TabSelector";
import TitleSection from "components/TitleSection";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import ChartList from "../../chart/ChartList";
import SortSelector from "../../SortSelector";
import Status from "../components/Status";
import {
  Br,
  InfoWrapper,
  LastDeployed,
  LineBreak,
  NamespaceTag,
  SepDot,
  Text,
} from "../components/styles";
import { getStackStatus, getStackStatusMessage } from "../shared";
import { FullStackRevision, Stack, StackRevision } from "../types";
import EnvGroups from "./components/EnvGroups";
import RevisionList from "./_RevisionList";
import SourceConfig from "./_SourceConfig";

const ExpandedStack = () => {
  const { namespace, stack_id } = useParams<{
    namespace: string;
    stack_id: string;
  }>();

  const { pushFiltered } = useRouting();

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const [stack, setStack] = useState<Stack>();
  const [sortType, setSortType] = useState("Alphabetical");
  const [isLoading, setIsLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState("apps");

  const [currentRevision, setCurrentRevision] = useState<FullStackRevision>();

  const getStack = async () => {
    setIsLoading(true);
    try {
      const newStack = await api
        .getStack<Stack>(
          "<token>",
          {},
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            stack_id: stack_id,
            namespace,
          }
        )
        .then((res) => res.data);

      setStack(newStack);
      setCurrentRevision(newStack.latest_revision);
      setIsLoading(false);
    } catch (error) {
      setCurrentError(error);
      pushFiltered("/stacks", []);
    }
  };

  useEffect(() => {
    getStack();
  }, [stack_id]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <StackTitleWrapper>
        <TitleSection
          materialIconClass="material-icons-outlined"
          icon={"lan"}
          capitalize
        >
          {stack.name}
        </TitleSection>
        <NamespaceTag.Wrapper>
          Namespace
          <NamespaceTag.Tag>{stack.namespace}</NamespaceTag.Tag>
        </NamespaceTag.Wrapper>
      </StackTitleWrapper>
      <RevisionList
        revisions={stack.revisions}
        currentRevision={currentRevision}
        latestRevision={stack.latest_revision}
        stackId={stack.id}
        stackNamespace={namespace}
        onRevisionClick={(revision) => setCurrentRevision(revision)}
        onRollback={() => getStack()}
      ></RevisionList>
      <Br />
      <InfoWrapper>
        <LastDeployed>
          <Status
            status={getStackStatus(stack)}
            message={getStackStatusMessage(stack)}
          />
          <SepDot>•</SepDot>
          <Text color="#aaaabb">
            {!stack.latest_revision?.id
              ? `No version found`
              : `v${stack.latest_revision.id}`}
          </Text>
          <SepDot>•</SepDot>
          Last updated {readableDate(stack.updated_at)}
        </LastDeployed>
      </InfoWrapper>

      {/* Stack error message */}
      {currentRevision &&
      currentRevision?.reason &&
      currentRevision?.message?.length > 0 ? (
        <StackErrorMessageStyles.Wrapper>
          <StackErrorMessageStyles.Title color="#b7b7c9">
            Revision message:
          </StackErrorMessageStyles.Title>
          <StackErrorMessageStyles.Text color="#aaaabb">
            {currentRevision?.status === "failed" ? "Error: " : ""}
            {currentRevision?.message}
          </StackErrorMessageStyles.Text>
        </StackErrorMessageStyles.Wrapper>
      ) : null}

      <TabSelector
        currentTab={currentTab}
        options={[
          {
            label: "Apps",
            value: "apps",
            component: (
              <>
                <Gap></Gap>
                {currentRevision.id !== stack.latest_revision.id ? (
                  <ChartListWrapper>
                    <Placeholder>
                      Not available when previewing versions
                    </Placeholder>
                  </ChartListWrapper>
                ) : (
                  <>
                    <SortSelector
                      setSortType={setSortType}
                      sortType={sortType}
                      currentView="stacks"
                    />

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
                  </>
                )}
              </>
            ),
          },
          {
            label: "Source Config",
            value: "source_config",
            component: (
              <>
                <SourceConfig
                  namespace={namespace}
                  revision={currentRevision}
                  readOnly={stack.latest_revision.id !== currentRevision.id}
                  onSourceConfigUpdate={() => getStack()}
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
                <EnvGroups stack={stack} />
              </>
            ),
          },
        ]}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
        }}
      ></TabSelector>
    </div>
  );
};

export default ExpandedStack;

const ChartListWrapper = styled.div`
  width: 100%;
  margin: auto;
  margin-top: 20px;
  padding-bottom: 125px;
`;

const Gap = styled.div`
  width: 100%;
  background: none;
  height: 30px;
`;

const StackErrorMessageStyles = {
  Text: styled(Text)`
    font-size: 14px;
    margin-bottom: 10px;
  `,
  Wrapper: styled.div`
    display: flex;
    flex-direction: column;
    margin-top: 5px;
  `,
  Title: styled(Text)`
    font-size: 16px;
    font-weight: bold;
  `,
};

const StackTitleWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;

  // Hotfix to make sure the title section and the namespace tag are aligned
  ${NamespaceTag.Wrapper} {
    margin-bottom: 15px;
  }
`;
