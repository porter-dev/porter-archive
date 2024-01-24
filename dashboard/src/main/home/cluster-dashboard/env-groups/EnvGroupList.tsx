import React from "react";
import styled from "styled-components";

import EnvGroup from "./EnvGroup";
import { type RouteComponentProps, withRouter } from "react-router";

type Props = RouteComponentProps & {
  envGroups: any[];
};

const EnvGroupList: React.FunctionComponent<Props> = ({ envGroups }) => {
  return (
    <StyledEnvGroupList>
      {envGroups.map((envGroup: any, i: number) => {
        return (
          <EnvGroup
            key={i}
            envGroup={envGroup}
          />
        );
      })}
    </StyledEnvGroupList>
  );
};

export default withRouter(EnvGroupList);

const StyledEnvGroupList = styled.div`
  padding-bottom: 85px;
`;