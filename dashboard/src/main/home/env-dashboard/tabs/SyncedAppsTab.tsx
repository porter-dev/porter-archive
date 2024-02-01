import React, { useContext, useState } from "react";
import { useHistory } from "react-router";
import styled from "styled-components";

import api from "shared/api";
import { Context } from "shared/Context";

import loading from "assets/loading.gif";

import Button from "components/porter/Button";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Container from "components/porter/Container";
import Image from "components/porter/Image";
import Clickable from "components/porter/Clickable";

type Props = {
  envGroup: {
    linkedApplications: string[];
  }
};

const SyncedAppsTab: React.FC<Props> = ({ envGroup }) => {
  const { currentProject, currentCluster, setCurrentOverlay } = useContext(Context);
  return (
    <FadeWrapper>
      <Clickable row>
        hello
      </Clickable>
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