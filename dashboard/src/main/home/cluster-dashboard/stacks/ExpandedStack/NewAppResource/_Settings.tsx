import { AxiosError } from "axios";
import { PopulatedEnvGroup } from "components/porter-form/types";
import React, { useContext, useEffect, useState } from "react";
import { useParams } from "react-router";
import api from "shared/api";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import NewAppResourceForm from "../../components/NewAppResourceForm";
import { CreateStackBody } from "../../types";
import { ExpandedStackStore } from "../Store";

const parsePopulatedEnvGroup = (envGroup: PopulatedEnvGroup) => {
  const variables = Object.entries(envGroup.variables)
    .filter(([_, value]) => !value.includes("PORTERSECRET"))
    .reduce(
      (acc, [key, value]) => ({ ...acc, [key]: value }),
      {} as Record<string, string>
    );
  const secret_variables = Object.entries(envGroup.variables)
    .filter(([_, value]) => value.includes("PORTERSECRET"))
    .reduce(
      (acc, [key, value]) => ({ ...acc, [key]: value }),
      {} as Record<string, string>
    );

  return {
    name: envGroup.name,
    variables,
    secret_variables,
    linked_applications: envGroup.applications as string[],
  };
};

const Settings = () => {
  const params = useParams<{
    template_name: string;
    template_version: string;
  }>();
  const { stack, refreshStack } = useContext(ExpandedStackStore);
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [availableEnvGroups, setAvailableEnvGroups] = useState<
    {
      name: string;
      variables: Record<string, string>;
      secret_variables: Record<string, string>;
      linked_applications: string[];
    }[]
  >([]);

  const { pushFiltered } = useRouting();

  const populateEnvGroups = async () => {
    const stackEnvGroups = stack.latest_revision.env_groups;
    const envGroupsPromises = stackEnvGroups.map((envGroup) =>
      api
        .getEnvGroup<PopulatedEnvGroup>(
          "<token>",
          {},
          {
            id: currentProject.id,
            cluster_id: currentCluster.id,
            name: envGroup.name,
            namespace: stack.namespace,
            version: envGroup.env_group_version,
          }
        )
        .then((res) => res.data)
    );

    try {
      const response = await Promise.allSettled(envGroupsPromises);

      const envGroups = response
        .map((res) => {
          if (res.status === "fulfilled") {
            return res.value;
          }
          return undefined;
        })
        .filter(Boolean);

      return envGroups;
    } catch (error) {
      setCurrentError(error);
      throw error;
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    populateEnvGroups().then((populatedEnvGroups) => {
      if (!isSubscribed) {
        return;
      }

      if (Array.isArray(populatedEnvGroups)) {
        const availableEnvGroups = populatedEnvGroups.map(
          parsePopulatedEnvGroup
        );

        setAvailableEnvGroups(availableEnvGroups);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [stack, params, currentProject, currentCluster]);

  const handleSubmit = async (
    appResource: CreateStackBody["app_resources"][0]
  ) => {
    try {
      await api.addStackAppResource(
        "<token>",
        {
          ...appResource,
        },
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: stack.namespace,
          stack_id: stack.id,
        }
      );

      await refreshStack();

      pushFiltered(`/stacks/${stack.namespace}/${stack.id}`, []);
    } catch (error) {
      const axiosError: AxiosError = error;
      if (axiosError.code === "409") {
        throw "Application resource name already exists.";
      }

      throw "Unexpected error, please try again.";
    }
  };

  return (
    <NewAppResourceForm
      availableEnvGroups={availableEnvGroups}
      namespace={stack.namespace}
      sourceConfig={stack.latest_revision.source_configs[0]}
      templateInfo={{
        name: params.template_name,
        version: params.template_version,
      }}
      onCancel={() => {
        pushFiltered(`../template-selector`, []);
      }}
      onSubmit={handleSubmit}
    />
  );
};

export default Settings;
