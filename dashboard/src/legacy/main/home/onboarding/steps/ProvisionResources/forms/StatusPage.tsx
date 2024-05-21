import Loading from "components/Loading";
import ProvisionerStatus from "components/ProvisionerStatus";
import React, { useEffect, useRef, useState } from "react";
import api from "shared/api";
import { Infrastructure } from "shared/types";
import styled from "styled-components";

type Props = {
  setInfraStatus: (status: {
    hasError: boolean;
    description?: string;
    errored_infras: number[];
  }) => void;
  project_id: number;
  filter: string[];
  auto_expanded?: boolean;
  notFoundText?: string;
  filterLatest?: boolean;
  retry_count?: number;
  sortBy?: string; // if empty, sorts by last updated. options are "last_updated" or "id"
  set_max_width?: boolean;
  can_delete?: boolean;
};

export const StatusPage = ({
  filter: selectedFilters,
  project_id,
  setInfraStatus,
  notFoundText = "We couldn't find any infra being provisioned.",
  filterLatest,
  auto_expanded,
  retry_count,
  sortBy,
  set_max_width,
  can_delete,
}: Props) => {
  const isMounted = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [infras, setInfras] = useState<Infrastructure[]>(null);

  const filterBySelectedInfras = (currentInfra: Infrastructure) => {
    if (!Array.isArray(selectedFilters) || !selectedFilters?.length) {
      return true;
    }

    if (selectedFilters.includes(currentInfra.kind)) {
      return true;
    }
    return false;
  };

  const getLatestInfras = (infras: Infrastructure[]) => {
    // Create a map with the relation infra.kind => infra
    // This will allow us to keep only one infra per kind.
    const infraMap = new Map<string, Infrastructure>();

    infras.forEach((infra) => {
      // Get last infra from that kind, kind being gke, ecr, etc.
      const latestSavedInfra = infraMap.get(infra.kind);

      // If infra doesn't exists, it means its the first one appearing so we save it
      if (!latestSavedInfra) {
        infraMap.set(infra.kind, infra);
        return;
      }

      // Check if the latest saved infra was recent than the one we're currently iterating
      // If the current one iterating is newer, then we update the map!
      if (
        new Date(infra.created_at).getTime() >
        new Date(latestSavedInfra.created_at).getTime()
      ) {
        infraMap.set(infra.kind, infra);
        return;
      }
    });

    // Get the array from the values of the array.
    return Array.from(infraMap.values());
  };

  const updateSingleInfraStatus = (infra: Infrastructure) => {
    // update the single infra
    setInfras((infras) => {
      if (!infras) {
        return [infra];
      }

      let newInfras = infras;

      newInfras = newInfras.map((newInfra) => {
        if (newInfra.id == infra.id) {
          return infra;
        }

        return newInfra;
      });

      // determine if all infras are in a final state, and if so report to parent
      let inProgressInfras = newInfras.filter((newInfra) => {
        if (newInfra.latest_operation) {
          return (
            newInfra.latest_operation.status != "completed" &&
            newInfra.latest_operation.status != "errored"
          );
        }

        return (
          newInfra.status == "creating" ||
          newInfra.status == "deleting" ||
          newInfra.status == "destroying"
        );
      });

      let erroredInfras = newInfras.filter((newInfra) => {
        if (newInfra.latest_operation) {
          return newInfra.latest_operation.errored;
        }

        return newInfra.status == "errored";
      });

      if (inProgressInfras.length == 0) {
        setInfraStatus({
          hasError: erroredInfras.length != 0,
          errored_infras: erroredInfras.map((infra) => {
            return infra.id;
          }),
        });
      }

      return [...newInfras];
    });

    // determine if all tracked infras are in a finalized state, and then report the
    // infra status to the parent
  };

  useEffect(() => {
    api
      .getInfra<Infrastructure[]>("<token>", {}, { project_id: project_id })
      .then(({ data }) => {
        const matchedInfras = data.filter(filterBySelectedInfras);

        if (sortBy == "id") {
          matchedInfras.sort((a, b) => {
            return b.id < a.id ? -1 : b.id > a.id ? 1 : 0;
          });
        }

        if (filterLatest) {
          // Get latest infras for each kind of infra on the array.
          const latestMatchedInfras = getLatestInfras(matchedInfras);
          setInfras(latestMatchedInfras);
        } else {
          setInfras(matchedInfras);
        }

        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
      });
  }, [project_id, retry_count]);

  if (isLoading) {
    return (
      <Placeholder>
        <Loading />
      </Placeholder>
    );
  }

  if (infras.length == 0) {
    return <Placeholder>{notFoundText}</Placeholder>;
  }

  return (
    <ProvisionerStatus
      infras={infras}
      project_id={project_id}
      auto_expanded={auto_expanded}
      setInfraStatus={updateSingleInfraStatus}
      set_max_width={set_max_width}
      can_delete={can_delete}
    />
  );
};

const Placeholder = styled.div`
  padding: 30px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: ${props => props.theme.fg};
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #494b4f;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;
