import React, { useContext, useMemo } from "react";
import _ from "lodash";
import { useHistory } from "react-router";
import styled from "styled-components";

import Fieldset from "components/porter/Fieldset";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import SelectableAppList from "main/home/app-dashboard/apps/SelectableAppList";
import { useLatestAppRevisions } from "lib/hooks/useLatestAppRevisions";

import { Context } from "shared/Context";

type Props = {
  envGroup: {
    linked_applications: string[];
  };
};

const SyncedAppsTab: React.FC<Props> = ({ envGroup }) => {
  const history = useHistory();
  const { currentProject, currentCluster } = useContext(Context);

  const { revisions } = useLatestAppRevisions({
    projectId: currentProject?.id || -1,
    clusterId: currentCluster?.id || -1,
  });

  const { connectedApps } = useMemo(() => {
    const [connected, remaining] = _.partition(
      revisions,
      (r) => envGroup.linked_applications?.includes(r.source.name)
    );
    return {
      connectedApps: connected.sort((a, b) =>
        a.source.name.localeCompare(b.source.name)
      ),
    };
  }, [revisions, envGroup.linked_applications]);

  return (
    <FadeWrapper>
      <Text size={16}>Synced applications</Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The following applications will be automatically redeployed when this
        env group is updated.
      </Text>
      <Spacer y={1} />
      {(!envGroup?.linked_applications ||
        envGroup.linked_applications.length === 0) && (
        <Fieldset>
          <Text size={16}>No synced applications were found</Text>
          <Spacer y={0.5} />
          <Text color="helper">
            Navigate to the &quot;Environment&quot; tab of an application on
            Porter to sync this environment group.
          </Text>
        </Fieldset>
      )}
      {connectedApps && (
        <SelectableAppList
          appListItems={connectedApps?.map((ra) => ({
            app: ra,
            key: ra.source.name,
            onSelect: () => {
              history.push(
                `/apps/${ra.source.name}/environment?target=${ra.app_revision.deployment_target.id}`
              );
            },
          }))}
        />
      )}
    </FadeWrapper>
  );
};

export default SyncedAppsTab;

const FadeWrapper = styled.div`
  width: 100%;
  animation: fadeIn 0.3s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
