import { useContext, useEffect, useState } from "react";
import { type PopulatedEnvGroup } from "legacy/components/porter-form/types";
import api from "legacy/shared/api";
import { type ChartType } from "legacy/shared/types";

import { Context } from "shared/Context";

import { type Stack } from "../stacks/types";

export const useStackEnvGroups = (chart: ChartType) => {
  const { currentProject, currentCluster, setCurrentError } =
    useContext(Context);
  const [stackEnvGroups, setStackEnvGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const getEnvGroups = async (stack: Stack) => {
    const envGroups = stack.latest_revision.env_groups;

    const envGroupsWithValues = envGroups.map(async (envGroup) => {
      return await api
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

    return await Promise.all(envGroupsWithValues);
  };

  const getStack = async (stack_id: string) =>
    await api
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
      .then(async (stack) => await getEnvGroups(stack))
      .then((populatedEnvGroups) => {
        setStackEnvGroups(populatedEnvGroups);

        setLoading(false);
      })
      .catch((error) => {
        setCurrentError(error);
      });
  }, [chart?.stack_id]);

  return {
    isStack: !!chart?.stack_id?.length,
    stackEnvGroups,
    isLoadingStackEnvGroups: loading,
  };
};
