import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { Card } from "../../launch/components/styles";
import { Stack } from "../../types";
import sliders from "assets/sliders.svg";
import DynamicLink from "components/DynamicLink";

type PopulatedEnvGroup = {
  applications: string[];
  created_at: string;
  meta_version: number;
  name: string;
  namespace: string;
  variables: Record<string, string>;
  version: number;
};

const EnvGroups = ({ stack }: { stack: Stack }) => {
  const { currentProject, currentCluster } = useContext(Context);
  const [envGroups, setEnvGroups] = useState<PopulatedEnvGroup[]>([]);

  const getEnvGroups = async () => {
    const stackEnvGroups = stack.latest_revision.env_groups;
    return Promise.all(
      stackEnvGroups.map((envGroup) =>
        api
          .getEnvGroup<PopulatedEnvGroup>(
            "<token>",
            {},
            {
              cluster_id: currentCluster.id,
              id: currentProject.id,
              name: envGroup.name,
              namespace: stack.namespace,
              version: envGroup.env_group_version,
            }
          )
          .then((res) => res.data)
      )
    );
  };

  useEffect(() => {
    getEnvGroups().then((envGroups) => {
      setEnvGroups(envGroups);
    });
  }, [stack]);

  return (
    <Card.Grid>
      {envGroups.map((envGroup) => {
        return (
          <Card.Wrapper>
            <Card.Title>
              <Card.Icon src={sliders}></Card.Icon>
              {envGroup.name}
            </Card.Title>

            <Card.Actions>
              <Card.ActionButton
                as={DynamicLink}
                to={{
                  pathname: "/env-groups",
                  search: `?namespace=${stack.namespace}&selected_env_group=${
                    envGroup.name
                  }&redirect_url=${encodeURIComponent(
                    window.location.pathname
                  )}`,
                }}
              >
                <i className="material-icons-outlined">launch</i>
              </Card.ActionButton>
            </Card.Actions>
          </Card.Wrapper>
        );
      })}
    </Card.Grid>
  );
};

export default EnvGroups;
