import Loading from "components/Loading";
import TitleSection from "components/TitleSection";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { readableDate } from "shared/string_utils";
import styled from "styled-components";
import ChartList from "../chart/ChartList";
import SortSelector from "../SortSelector";
import Status from "./components/Status";
import {
  Br,
  InfoWrapper,
  LastDeployed,
  LineBreak,
  SepDot,
  Text,
} from "./components/styles";
import { getStackStatus, getStackStatusMessage } from "./shared";
import { Stack } from "./types";

const ExpandedStack = () => {
  const { namespace, stack_id } = useParams<{
    namespace: string;
    stack_id: string;
  }>();
  const { currentProject, currentCluster } = useContext(Context);

  const [stack, setStack] = useState<Stack>();
  const [sortType, setSortType] = useState("Alphabetical");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log(stack_id);
    let isSubscribed = true;

    api
      .getStack(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          stack_id: stack_id,
          namespace,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          setStack(res.data);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });
  }, [stack_id]);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <div>
      <TitleSection
        materialIconClass="material-icons-outlined"
        icon={"lan"}
        capitalize
      >
        {stack.name}
      </TitleSection>
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
      {stack.latest_revision &&
      stack.latest_revision.status === "failed" &&
      stack.latest_revision.message?.length > 0 ? (
        <StackErrorMessageStyles.Wrapper>
          <StackErrorMessageStyles.Title color="#b7b7c9">
            Error reason:
          </StackErrorMessageStyles.Title>
          <StackErrorMessageStyles.Text color="#aaaabb">
            {stack.latest_revision.message}
          </StackErrorMessageStyles.Text>
        </StackErrorMessageStyles.Wrapper>
      ) : null}

      <LineBreak />

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
            stack?.latest_revision?.resources?.map((res) => res.name) || []
          }
          closeChartRedirectUrl={`${window.location.pathname}${window.location.search}`}
        />
      </ChartListWrapper>
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
