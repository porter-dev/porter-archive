import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useMemo, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import Placeholder from "components/OldPlaceholder";
import styled from "styled-components";
import { Stack } from "./types";
import { readableDate } from "shared/string_utils";
import { Card } from "./launch/components/styles";
import Status, { StatusProps } from "./components/Status";
import {
  Flex,
  InfoWrapper,
  LastDeployed,
  NamespaceTag,
  SepDot,
  Text,
} from "./components/styles";
import { getStackStatus, getStackStatusMessage } from "./shared";

const StackList = ({
  namespace,
  sortBy,
}: {
  namespace: string;
  sortBy: "created_at" | "updated_at" | "alphabetical";
}) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [stacks, setStacks] = useState<Stack[]>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = (stack: Stack) => {
    setDeleting(stack.id);
    api
      .deleteStack(
        "<token>",
        {},
        {
          namespace,
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          stack_id: stack.id,
        }
      )
      .then(() => {
        setStacks((prev) => prev.filter((s) => s.id !== stack.id));
      })
      .catch((err) => {
        setCurrentError(err);
      })
      .finally(() => {
        setDeleting(null);
      });
  };

  useEffect(() => {
    let isSubscribed = true;

    setIsLoading(true);

    api
      .listStacks(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          setStacks(res.data);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          setCurrentError(err);
        }
      })
      .finally(() => {
        if (isSubscribed) {
          setIsLoading(false);
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [namespace, currentCluster]);

  const sortedStacks = useMemo(() => {
    return (
      stacks?.sort((a, b) => {
        switch (sortBy) {
          case "created_at":
            return Date.parse(a.created_at) < Date.parse(b.created_at) ? 1 : -1;
          case "updated_at":
            return Date.parse(a.updated_at) < Date.parse(b.updated_at) ? 1 : -1;
          default:
            return a.name > b.name ? 1 : -1;
        }
      }) || []
    );
  }, [stacks, sortBy]);

  if (isLoading) {
    return <Loading />;
  }

  if (stacks?.length === 0) {
    return (
      <Placeholder height="250px">
        <div>
          <h3>No stacks found</h3>
          <p>You can create a stack by clicking the "Create stack" button.</p>
        </div>
      </Placeholder>
    );
  }

  if (sortedStacks.length === 0) {
    return (
      <Placeholder height="250px">
        <div>
          <h3>No stacks found with the given filters</h3>
        </div>
      </Placeholder>
    );
  }

  return (
    <>
      <Card.Grid>
        {stacks.map((stack) => (
          <StackCard
            as={DynamicLink}
            key={stack?.id}
            to={`/stacks/${stack?.namespace}/${stack?.id}`}
          >
            <DataContainer>
              <Top>
                <StackName>
                  <StackIcon>
                    <i className="material-icons-outlined">lan</i>
                  </StackIcon>
                  <span>{stack.name}</span>
                </StackName>
                <SepDot>•</SepDot>
                <NamespaceTag.Wrapper>
                  Namespace
                  <NamespaceTag.Tag>{stack.namespace}</NamespaceTag.Tag>
                </NamespaceTag.Wrapper>
              </Top>
              <InfoWrapper>
                <LastDeployed>
                  <Status
                    status={getStackStatus(stack)}
                    message={getStackStatusMessage(stack)}
                  />
                  <SepDot>•</SepDot>
                  <Text color="#aaaabb">
                    {!stack.latest_revision?.id
                      ? `No version found`
                      : `v${stack.latest_revision.id}`}
                  </Text>
                  <SepDot>•</SepDot>
                  Last updated {readableDate(stack.updated_at)}
                </LastDeployed>
              </InfoWrapper>
            </DataContainer>
            <Flex>
              <RowButton
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(stack);
                }}
                disabled={
                  deleting === stack.id || (deleting && deleting === stack.id)
                }
              >
                <i className="material-icons">delete</i>

                {deleting === stack.id ? <Loading /> : "Delete"}
              </RowButton>
            </Flex>
          </StackCard>
        ))}
      </Card.Grid>
    </>
  );
};

export default StackList;

const RowButton = styled.button`
  min-width: 82px;
  white-space: nowrap;
  font-size: 12px;
  padding: 8px 10px;
  font-weight: 400;
  height: 32px;
  margin-right: 5px;
  margin-left: 10px;
  border-radius: 5px;
  color: #ffffff;
  border: 1px solid #aaaabb;
  display: flex;
  align-items: center;
  background: #ffffff08;
  cursor: pointer;
  :hover {
    background: #ffffff22;
  }

  > i {
    font-size: 14px;
    margin-right: 8px;
  }
`;

const StackIcon = styled.div`
  margin-bottom: -4px;

  > i {
    font-size: 18px;
    margin-left: -1px;
    margin-right: 9px;
    color: #ffffff66;
  }
`;

const StackName = styled.div`
  font-family: "Work Sans", sans-serif;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  font-size: 14px;
  align-items: center;
`;

const DataContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  max-width: calc(100% - 100px);
  overflow: hidden;
`;

const StackCard = styled(Card.Wrapper)`
  font-size: 13px;
  font-weight: 500;
`;

const Top = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;
