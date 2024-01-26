import React, { useMemo } from "react";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import Back from "components/porter/Back";

type Props = RouteComponentProps;

const AppView: React.FC<Props> = ({ match }) => {
  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        appName: z.string(),
        tab: z.string().optional(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        appName: undefined,
        tab: undefined,
      };
    }

    return validParams.data;
  }, [match]);

  return (
    <StyledExpandedApp>
      <Back to="/envs" />
      <div>ok cool</div>
    </StyledExpandedApp>
  );
};

export default withRouter(AppView);

const StyledExpandedApp = styled.div`
  width: 100%;
  height: 100%;

  animation: fadeIn 0.5s 0s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
