import React, { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import Loading from "components/Loading";
import Placeholder from "components/OldPlaceholder";
import Description from "components/Description";
import { ClusterType } from "shared/types";
import SelectRow from "components/form-components/SelectRow";
import SaveButton from "components/SaveButton";

type Props = {
  selectCluster: (cluster_id: number) => void;
};

const ClusterList: React.FunctionComponent<Props> = ({ selectCluster }) => {
  const { currentProject, setCurrentError } = useContext(Context);
  const [isLoading, setIsLoading] = useState(true);
  const [clusters, setClusters] = useState<ClusterType[]>([]);
  const [selectedClusterID, setSelectedClusterID] = useState<number>();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    api
      .getClusters(
        "<token>",
        {},
        {
          id: currentProject.id,
        }
      )
      .then(({ data }) => {
        if (!Array.isArray(data)) {
          throw Error("Data is not an array");
        }

        setClusters(data);
        setSelectedClusterID(data[0]?.id);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHasError(true);
        setCurrentError(err.response?.data?.error);
        setIsLoading(false);
      });
  }, [currentProject]);

  if (hasError) {
    return <Placeholder>Error</Placeholder>;
  }

  if (isLoading || !clusters) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (clusters.length == 0) {
    return (
      <Placeholder>
        At least one cluster must exist to create this resource
      </Placeholder>
    );
  }

  return (
    <>
      <Description>
        Select your credentials from the list below, or create a new credential:
      </Description>
      <SelectRow
        options={clusters.map((cluster, i) => {
          return {
            label: cluster.name,
            value: "" + cluster.id,
          };
        })}
        width="100%"
        scrollBuffer={true}
        value={"" + selectedClusterID}
        dropdownMaxHeight="240px"
        setActiveValue={(x: string) => {
          setSelectedClusterID(parseInt(x));
        }}
        label="Cluster Options"
      />
      <SaveButton
        text="Continue"
        disabled={false}
        onClick={() => selectCluster(selectedClusterID)}
        makeFlush={true}
        clearPosition={true}
        statusPosition={"right"}
      />
    </>
  );
};

export default ClusterList;
