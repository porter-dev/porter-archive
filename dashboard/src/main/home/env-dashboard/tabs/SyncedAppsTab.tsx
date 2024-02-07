import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import loading from "assets/loading.gif";
import box from "assets/box.png";

import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Clickable from "components/porter/Clickable";
import Placeholder from "components/Placeholder";
import Fieldset from "components/porter/Fieldset";

type Props = {
  envGroup: {
    linked_applications: string[];
  }
};

const SyncedAppsTab: React.FC<Props> = ({ envGroup }) => {
  const history = useHistory();
  const { currentProject, currentCluster } = useContext(Context);
  return (
    <FadeWrapper>
      <Text size={16}>
        Synced applications
      </Text>
      <Spacer y={0.5} />
      <Text color="helper">
        The following applications will be automatically redeployed when this env group is updated.
      </Text>
      <Spacer y={1} />
      {(!envGroup?.linked_applications || envGroup.linked_applications.length === 0) && (
        <Fieldset>
          <Text size={16}>
            No synced applications were found
          </Text>
          <Spacer y={0.5} />
          <Text color="helper">
            Navigate to the &quot;Environment&quot; tab of an application on Porter to sync this environment group.
          </Text>
        </Fieldset>
      )}
      {envGroup?.linked_applications?.map((app: string, i: number) => {
        return (
          <>
            <Clickable key={i} row onClick={() => {
              history.push(`/apps/${app}/environment`);
            }}>
              <Container row>
                <Image src={box} size={18} />
                <Spacer inline x={.75} />
                <Text>{app}</Text>
              </Container>
            </Clickable>
            <Spacer y={.5} />
          </>
        );
      })}
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