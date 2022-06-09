import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { GetStacksResponse, Stack } from "./types";

const StackList = () => {
  const [stacks, setStacks] = useState<Stack[]>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    mockApi()
      .then((res) => {
        setStacks(res.data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      {stacks.map((stack) => (
        <Card to={`/stacks/${stack.id}`} key={stack.id}>
          {stack.name} - Current Revision: {stack.latest_revision.id}
        </Card>
      ))}
    </>
  );
};

export default StackList;

const Card = styled(DynamicLink)`
  display: block;
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
