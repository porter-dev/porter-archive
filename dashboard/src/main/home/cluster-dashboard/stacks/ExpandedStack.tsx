import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import styled from "styled-components";
import ChartList from "../chart/ChartList";
import DashboardHeader from "../DashboardHeader";
import SortSelector from "../SortSelector";
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
      <DashboardHeader
        title={stack?.name}
        materialIconClass="material-icons-outlined"
        image="lan"
      />

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
