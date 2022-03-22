import { DatabaseObject } from "./DatabasesList";

export const mock_database_list: DatabaseObject[] = [
  {
    cluster_id: 1,
    instance_endpoint: "some/some",
    instance_id: "my-id",
    instance_name: "instance-name",
    project_id: 3,
    infra_id: 1,
    status: "running",
  },
  {
    cluster_id: 1,
    instance_endpoint: "some/some",
    instance_id: "my-id",
    instance_name: "instance-name",
    project_id: 3,
    infra_id: 2,
    status: "running",
  },
  {
    cluster_id: 1,
    instance_endpoint: "some/some",
    instance_id: "my-id",
    instance_name: "instance-name",
    project_id: 3,
    infra_id: 3,
    status: "running",
  },
];
