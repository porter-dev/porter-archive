import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import Placeholder from "components/Placeholder";
import styled from "styled-components";
import { GetStacksResponse, Stack } from "./types";
import { readableDate } from "shared/string_utils";

const StackList = ({ namespace }: { namespace: string }) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [stacks, setStacks] = useState<Stack[]>(null);
  const [isLoading, setIsLoading] = useState(true);

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
  }, [namespace]);

  if (isLoading) {
    return <Loading />;
  }

  if (stacks?.length === 0) {
    return (
      <Placeholder
        height="250px"
      >
        <div>
        <h3>No stacks found</h3>
        <p>You can create a stack by clicking the "Create Stack" button.</p>
        </div>
      </Placeholder>
    );
  }

  return (
    <>
      {stacks.map((stack) => (
        <StackCard key={stack?.id}>
          <LinkMask to={`/stacks/${namespace}/${stack?.id}`}  />
          <DataContainer>
            <StackName>
              <StackIcon>
                <i className="material-icons-outlined">lan</i>
              </StackIcon>
              <span>
                {stack.name}
              </span>
            </StackName>

            <Flex>
              <DeploymentImageContainer>
                <InfoWrapper>
                  <LastDeployed>
                    <Revision>
                    {!stack.latest_revision?.id
                    ? `No version found`
                    : `v${stack.latest_revision.id}`}
                    </Revision>
                    <SepDot>•</SepDot>
                    Last updated {readableDate(stack.updated_at)}
                  </LastDeployed>
                </InfoWrapper>
              </DeploymentImageContainer>
            </Flex>
          </DataContainer>
          <MinFlex>
            <RowButton>
              <i className="material-icons">delete</i>
              Delete
            </RowButton>
          </MinFlex>
        </StackCard>
      ))}
    </>
  );
};

export default StackList;

const RowButton = styled.div`
  white-space: nowrap;
  font-size: 12px;
  z-index: 999;
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

const Revision = styled.div`
  color: #aaaabb;
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
  margin-bottom: 10px;
`;

const SepDot = styled.div`
  color: #aaaabb66;
  margin: 0 9px;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
`;

const LastDeployed = styled.div`
  font-size: 13px;
  margin-top: -1px;
  display: flex;
  align-items: center;
  color: #aaaabb66;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  margin-left: 1px;
`;

const Flex = styled.div`
  display: flex;
  align-items: center;
`;

const MinFlex = styled.div`
  display: flex;
  align-items: center;
`;

const DataContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  max-width: calc(100% - 100px);
  overflow: hidden;
`;

const LinkMask = styled(DynamicLink)`
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
`;

const StackCard = styled.div`
  color: #ffffff;
  display: flex;
  font-weight: 500;
  position: relative;
  background: #2b2e3699;
  justify-content: space-between;
  border-radius: 5px;
  font-size: 13px;
  height: 75px;
  padding: 12px;
  padding-left: 14px;
  border: 1px solid #ffffff2f;

  animation: fadeIn 0.5s;
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const mockApi = () =>
  new Promise<{ data: GetStacksResponse }>((res) =>
    setTimeout(() => res({ data: StacksMock }), 500)
  );

const StacksMock: GetStacksResponse = [
  {
    created_at: "2022-06-09T11:59:27.729463-04:00",
    updated_at: "2022-06-09T11:59:27.729463-04:00",
    name: "string",
    id: "5433422f46f3ba52e49bb46dd1e12ab5",
    latest_revision: {
      created_at: "2022-06-09T11:59:27.731416-04:00",
      id: 1,
      status: "deploying",
      stack_id: "5433422f46f3ba52e49bb46dd1e12ab5",
      resources: [
        {
          created_at: "2022-06-09T11:59:27.732213-04:00",
          updated_at: "2022-06-09T11:59:27.732213-04:00",
          stack_id: "5433422f46f3ba52e49bb46dd1e12ab5",
          stack_revision_id: 1,
          name: "string",
          id: "4b2cae112ca29203acdef784392e7ac0",
          stack_app_data: {
            template_repo_url: "",
            template_name: "string",
            template_version: "string",
          },
          stack_source_config: {
            created_at: "2022-06-09T11:59:27.732334-04:00",
            updated_at: "2022-06-09T11:59:27.732334-04:00",
            stack_id: "5433422f46f3ba52e49bb46dd1e12ab5",
            stack_revision_id: 1,
            name: "my-source-config",
            id: "0d6aa05dcb37e5a0a4e8febd4854dac2",
            image_repo_uri: "image-repo-uri",
            image_tag: "tag",
          },
        },
      ],
      source_configs: [
        {
          created_at: "2022-06-09T11:59:27.732334-04:00",
          updated_at: "2022-06-09T11:59:27.732334-04:00",
          stack_id: "5433422f46f3ba52e49bb46dd1e12ab5",
          stack_revision_id: 1,
          name: "my-source-config",
          id: "0d6aa05dcb37e5a0a4e8febd4854dac2",
          image_repo_uri: "image-repo-uri",
          image_tag: "tag",
        },
      ],
    },
    revisions: [
      {
        created_at: "2022-06-09T11:59:27.731416-04:00",
        id: 1,
        status: "deploying",
        stack_id: "5433422f46f3ba52e49bb46dd1e12ab5",
      },
    ],
  },
  {
    created_at: "2022-06-09T11:59:27.729463-04:00",
    updated_at: "2022-06-09T11:59:27.729463-04:00",
    name: "string",
    id: "9873422f46f3ba52e49bb46dd1e12ab5",
    latest_revision: {
      created_at: "2022-06-09T11:59:27.731416-04:00",
      id: 1,
      status: "deploying",
      stack_id: "9873422f46f3ba52e49bb46dd1e12ab5",
      resources: [
        {
          created_at: "2022-06-09T11:59:27.732213-04:00",
          updated_at: "2022-06-09T11:59:27.732213-04:00",
          stack_id: "9873422f46f3ba52e49bb46dd1e12ab5",
          stack_revision_id: 1,
          name: "string",
          id: "4b2cae112ca29203acdef784392e7ac0",
          stack_app_data: {
            template_repo_url: "",
            template_name: "string",
            template_version: "string",
          },
          stack_source_config: {
            created_at: "2022-06-09T11:59:27.732334-04:00",
            updated_at: "2022-06-09T11:59:27.732334-04:00",
            stack_id: "9873422f46f3ba52e49bb46dd1e12ab5",
            stack_revision_id: 1,
            name: "my-source-config",
            id: "0d6aa05dcb37e5a0a4e8febd4854dac2",
            image_repo_uri: "image-repo-uri",
            image_tag: "tag",
          },
        },
      ],
      source_configs: [
        {
          created_at: "2022-06-09T11:59:27.732334-04:00",
          updated_at: "2022-06-09T11:59:27.732334-04:00",
          stack_id: "9873422f46f3ba52e49bb46dd1e12ab5",
          stack_revision_id: 1,
          name: "my-source-config",
          id: "0d6aa05dcb37e5a0a4e8febd4854dac2",
          image_repo_uri: "image-repo-uri",
          image_tag: "tag",
        },
      ],
    },
    revisions: [
      {
        created_at: "2022-06-09T11:59:27.731416-04:00",
        id: 1,
        status: "deploying",
        stack_id: "9873422f46f3ba52e49bb46dd1e12ab5",
      },
    ],
  },
  {
    created_at: "2022-06-09T11:59:27.729463-04:00",
    updated_at: "2022-06-09T11:59:27.729463-04:00",
    name: "string",
    id: "1753422f46f3ba52e49bb46dd1e12ab5",
    latest_revision: {
      created_at: "2022-06-09T11:59:27.731416-04:00",
      id: 1,
      status: "deploying",
      stack_id: "1753422f46f3ba52e49bb46dd1e12ab5",
      resources: [
        {
          created_at: "2022-06-09T11:59:27.732213-04:00",
          updated_at: "2022-06-09T11:59:27.732213-04:00",
          stack_id: "1753422f46f3ba52e49bb46dd1e12ab5",
          stack_revision_id: 1,
          name: "string",
          id: "4b2cae112ca29203acdef784392e7ac0",
          stack_app_data: {
            template_repo_url: "",
            template_name: "string",
            template_version: "string",
          },
          stack_source_config: {
            created_at: "2022-06-09T11:59:27.732334-04:00",
            updated_at: "2022-06-09T11:59:27.732334-04:00",
            stack_id: "1753422f46f3ba52e49bb46dd1e12ab5",
            stack_revision_id: 1,
            name: "my-source-config",
            id: "0d6aa05dcb37e5a0a4e8febd4854dac2",
            image_repo_uri: "image-repo-uri",
            image_tag: "tag",
          },
        },
      ],
      source_configs: [
        {
          created_at: "2022-06-09T11:59:27.732334-04:00",
          updated_at: "2022-06-09T11:59:27.732334-04:00",
          stack_id: "1753422f46f3ba52e49bb46dd1e12ab5",
          stack_revision_id: 1,
          name: "my-source-config",
          id: "0d6aa05dcb37e5a0a4e8febd4854dac2",
          image_repo_uri: "image-repo-uri",
          image_tag: "tag",
        },
      ],
    },
    revisions: [
      {
        created_at: "2022-06-09T11:59:27.731416-04:00",
        id: 1,
        status: "deploying",
        stack_id: "1753422f46f3ba52e49bb46dd1e12ab5",
      },
    ],
  },
];
