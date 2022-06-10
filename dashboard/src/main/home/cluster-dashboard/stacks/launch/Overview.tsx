import React, { useContext, useEffect, useState } from "react";
import { StacksLaunchContext } from "./Store";
import InputRow from "components/form-components/InputRow";
import Selector from "components/Selector";
import api from "shared/api";
import { Context } from "shared/Context";
import { ClusterType } from "shared/types";
import useAuth from "shared/auth/useAuth";
import DynamicLink from "components/DynamicLink";

const Overview = () => {
  const {
    newStack,
    clusterId,
    namespace,
    setStackName,
    setStackNamespace,
    setStackCluster,
  } = useContext(StacksLaunchContext);
  const { currentProject } = useContext(Context);
  const [isAuthorized] = useAuth();

  const [clusterOptions, setClusterOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const [namespaceOptions, setNamespaceOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const getClusters = () => {
    return api
      .getClusters("<token>", {}, { id: currentProject.id })
      .then((res) => {
        if (res.data) {
          let clusterOptions: {
            label: string;
            value: string;
          }[] = res.data.map((cluster: ClusterType, i: number) => ({
            label: cluster.name,
            value: `${cluster.id}`,
          }));

          if (res.data.length > 0) {
            setClusterOptions(clusterOptions);
            console.log({ clusterId });
            if (isNaN(clusterId)) {
              const newClusterId = res.data[0].id;
              setStackCluster(newClusterId);
            }
          }
        }
      });
  };

  const updateNamespaces = (cluster_id: number) => {
    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id,
        }
      )
      .then((res) => {
        if (res.data) {
          const availableNamespaces = res.data.items.filter(
            (namespace: any) => {
              return namespace.status.phase !== "Terminating";
            }
          );
          const namespaceOptions = availableNamespaces.map(
            (x: { metadata: { name: string } }) => {
              return { label: x.metadata.name, value: x.metadata.name };
            }
          );
          if (availableNamespaces.length > 0) {
            setNamespaceOptions(namespaceOptions);
          }
        }
      })
      .catch(console.log);
  };

  useEffect(() => {
    getClusters();
  }, []);

  useEffect(() => {
    if (isNaN(clusterId)) {
      return;
    }
    updateNamespaces(clusterId);
  }, [clusterId]);

  return (
    <>
      <InputRow
        type="string"
        value={newStack.name}
        setValue={(newName: string) => setStackName(newName)}
      />

      <Selector
        activeValue={`${clusterId}`}
        setActiveValue={(cluster: string) => {
          setStackCluster(Number(cluster));
        }}
        options={clusterOptions}
        width="250px"
        dropdownWidth="335px"
        closeOverlay={true}
      />

      <Selector
        key={"namespace"}
        refreshOptions={() => {
          updateNamespaces(clusterId);
        }}
        addButton={isAuthorized("namespace", "", ["get", "create"])}
        activeValue={namespace}
        setActiveValue={(val) => setStackNamespace(val)}
        options={namespaceOptions}
        width="250px"
        dropdownWidth="335px"
        closeOverlay={true}
      />

      <br />
      {newStack.app_resources.map((app) => (
        <div key={app.name}>{app.name}</div>
      ))}

      <DynamicLink to="/stacks/launch/new-app"> New Application </DynamicLink>
    </>
  );
};

export default Overview;
