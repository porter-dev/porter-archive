import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { Card } from "../../launch/components/styles";
import { Stack } from "../../types";
import sliders from "assets/sliders.svg";
import DynamicLink from "components/DynamicLink";
import Placeholder from "components/Placeholder";
import Loading from "components/Loading";

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
  const [isLoading, setIsLoading] = useState(true);
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
    let isSubscribed = true;
    getEnvGroups().then((envGroups) => {
      if (!isSubscribed) {
        return;
      }
      setEnvGroups(envGroups);
      setIsLoading(false);
    });

    return () => {
      isSubscribed = false;
    };
  }, [stack]);

  if (isLoading) {
    return (
      <Placeholder height="250px">
        <Loading />
      </Placeholder>
    );
  }

  if (envGroups.length === 0) {
    return (
      <Placeholder height="250px">
        <div>
          <h3>No environment groups found for this stack</h3>
        </div>
      </Placeholder>
    );
  }

  return (
    <Card.Grid style={{ marginTop: "0px" }}>
      {envGroups.map((envGroup) => {
        return (
          <Card.Wrapper variant="unclickable">
            <Card.Title>
              <Card.SmallerIcon src={sliders}></Card.SmallerIcon>
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
