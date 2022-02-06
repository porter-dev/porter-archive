import Loading from "components/Loading";
import ProvisionerStatus from "components/ProvisionerStatus";
import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "shared/api";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import { Infrastructure } from "shared/types";
import styled from "styled-components";

type Props = {
  setInfraStatus: (status: { hasError: boolean; description?: string }) => void;
  project_id: number;
  filter: string[];
  auto_expanded?: boolean;
  notFoundText?: string;
  filterLatest?: boolean;
};

export const StatusPage = ({
  filter: selectedFilters,
  project_id,
  setInfraStatus,
  notFoundText = "We couldn't find any infra being provisioned.",
  filterLatest,
  auto_expanded,
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

  useEffect(() => {
    api
      .getInfra<Infrastructure[]>("<token>", {}, { project_id: project_id })
      .then(({ data }) => {
        const matchedInfras = data.filter(filterBySelectedInfras);

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
  }, [project_id]);

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
      setInfraStatus={setInfraStatus}
    />
  );
};

const Placeholder = styled.div`
  padding: 30px;
  margin-top: 35px;
  padding-bottom: 40px;
  font-size: 13px;
  color: #ffffff44;
  min-height: 400px;
  height: 50vh;
  background: #ffffff11;
  border-radius: 8px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  > i {
    font-size: 18px;
    margin-right: 8px;
  }
`;
