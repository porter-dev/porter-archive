import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import styled from "styled-components";
import Loading from "components/Loading";
import { TFState } from "shared/types";
import Placeholder from "components/OldPlaceholder";

type Props = {
  infra_id: number;
};

const InfraResourceList: React.FunctionComponent<Props> = ({ infra_id }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [infraState, setInfraState] = useState<TFState>(null);
  const { currentProject, setCurrentError } = useContext(Context);

  useEffect(() => {
    api
      .getInfraState(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
        }
      )
      .then(({ data }) => {
        setInfraState(data);

        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  }, [currentProject]);

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (!infraState) {
    return <Placeholder>No resources available</Placeholder>;
  }

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  const renderContents = () => {
    return Object.keys({ ...(infraState?.resources || {}) }).map((key) => {
      return (
        <StyledResource key={key} lastItem={false} isSelected={false}>
          {key}
        </StyledResource>
      );
    });
  };

  return (
    <InfraResourceListWrapper>
      <ListContainer>{renderContents()}</ListContainer>
    </InfraResourceListWrapper>
  );
};

export default InfraResourceList;

const InfraResourceListWrapper = styled.div`
  width: 100%;
  height: 100%;
`;

const ListContainer = styled.div`
  width: 100%;
  border-radius: 3px;
  border: 1px solid #ffffff44;
  max-height: 400px;
  background: #ffffff11;
  overflow-y: auto;
`;

const StyledResource = styled.div`
  display: flex;
  width: 100%;
  font-size: 13px;
  border-bottom: 1px solid
    ${(props: { lastItem: boolean; isSelected: boolean }) =>
      props.lastItem ? "#00000000" : "#606166"};
  color: #ffffff;
  user-select: none;
  align-items: center;
  padding: 10px;
  cursor: pointer;
  background: #ffffff11;
  :hover {
    background: #ffffff22;

    > i {
      background: #ffffff22;
    }
  }

  > img,
  i {
    width: 18px;
    height: 18px;
    margin-left: 12px;
    margin-right: 12px;
    font-size: 20px;
  }
`;
