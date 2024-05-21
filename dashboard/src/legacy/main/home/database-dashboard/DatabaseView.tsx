import React, { useMemo } from "react";
import Back from "legacy/components/porter/Back";
import Spacer from "legacy/components/porter/Spacer";
import { withRouter, type RouteComponentProps } from "react-router";
import styled from "styled-components";
import { z } from "zod";

import { DatastoreContextProvider } from "./DatabaseContextProvider";
import DatabaseHeader from "./DatabaseHeader";
import DatabaseTabs from "./DatabaseTabs";

type Props = RouteComponentProps;

const DatabaseView: React.FC<Props> = ({ match }) => {
  const params = useMemo(() => {
    const { params } = match;
    const validParams = z
      .object({
        tab: z.string().optional(),
        datastoreName: z.string().optional(),
      })
      .safeParse(params);

    if (!validParams.success) {
      return {
        tab: undefined,
      };
    }

    return validParams.data;
  }, [match]);

  return (
    <DatastoreContextProvider datastoreName={params.datastoreName}>
      <StyledExpandedDB>
        <Back to="/datastores" />
        <DatabaseHeader />
        <Spacer y={1} />
        <DatabaseTabs tabParam={params.tab} />
      </StyledExpandedDB>
    </DatastoreContextProvider>
  );
};

export default withRouter(DatabaseView);

const StyledExpandedDB = styled.div`
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
