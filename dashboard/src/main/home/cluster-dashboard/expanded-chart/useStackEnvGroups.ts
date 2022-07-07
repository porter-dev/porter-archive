import { PopulatedEnvGroup } from "components/porter-form/types";
import { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartType } from "shared/types";
import { Stack } from "../stacks/types";

export const useStackEnvGroups = (chart: ChartType) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [stackEnvGroups, setStackEnvGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const getEnvGroups = async (stack: Stack) => {
    const envGroups = stack.latest_revision.env_groups;

    const envGroupsWithValues = envGroups.map((envGroup) => {
      return api
        .getEnvGroup<PopulatedEnvGroup>(
          "<token>",
          {},
          {
            id: currentProject.id,
            namespace: chart.namespace,
            cluster_id: currentCluster.id,
            name: envGroup.name,
            version: envGroup.env_group_version,
          }
        )
        .then((res) => res.data);
    });

    return Promise.all(envGroupsWithValues);
  };

  const getStack = (stack_id: string) =>
    api
      .getStack<Stack>(
        "token",
        {},
        {
          cluster_id: currentCluster.id,
          project_id: currentProject.id,
          stack_id,
          namespace: chart.namespace,
        }
      )
      .then((res) => res.data);

  useEffect(() => {
    const stack_id = chart?.stack_id;
    if (!stack_id) {
      // if the chart has been loaded and the chart doesn't have a stack id, set loading to false
      if (loading && chart) {
        setLoading(false);
      }

      return;
    }
    setLoading(true);
    getStack(stack_id)
      .then((stack) => getEnvGroups(stack))
      .then((populatedEnvGroups) => {
        setStackEnvGroups(populatedEnvGroups);

        setLoading(false);
      })
      .catch((error) => {
        setCurrentError(error);
      });
  }, [chart?.stack_id]);

  return {
    isStack: chart?.stack_id?.length ? true : false,
    stackEnvGroups,
    isLoadingStackEnvGroups: loading,
  };
};
