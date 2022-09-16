import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { Context } from "shared/Context";
import api from "shared/api";

import Selector from "components/Selector";

type Props = {
  setNamespace: (x: string) => void;
  namespace: string;
};

type StateType = {
  namespaceOptions: { label: string; value: string }[];
};

// TODO: fix update to unmounted component
export const NamespaceSelector: React.FunctionComponent<Props> = ({
  setNamespace,
  namespace,
}) => {
  const context = useContext(Context);
  let _isMounted = true;
  const [namespaceOptions, setNamespaceOptions] = useState<
    {
      label: string;
      value: string;
    }[]
  >([]);
  const [defaultNamespace, setDefaultNamespace] = useState<string>("default");

  const updateOptions = () => {
    let { currentCluster, currentProject } = context;

    api
      .getNamespaces(
        "<token>",
        {},
        {
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        if (_isMounted) {
          let namespaceOptions: { label: string; value: string }[] = [
            { label: "All", value: "ALL" },
          ];

          // Set namespace from URL if specified
          let queryString = window.location.search;
          let urlParams = new URLSearchParams(queryString);
          let urlNamespace = urlParams.get("namespace");
          if (urlNamespace === "ALL") {
            urlNamespace = "ALL";
          }

          const availableNamespaces = res.data.filter((namespace: any) => {
            return namespace.status !== "Terminating";
          });
          setDefaultNamespace("default");
          availableNamespaces.forEach((x: { name: string }, i: number) => {
            namespaceOptions.push({
              label: x.name,
              value: x.name,
            });
            if (x.name === urlNamespace) {
              setDefaultNamespace(urlNamespace);
            }
          });
          setNamespaceOptions(namespaceOptions);
        }
      })
      .catch((err) => {
        if (_isMounted) {
          setNamespaceOptions([{ label: "All", value: "ALL" }]);
        }
      });
  };

  useEffect(() => {
    let urlParams = new URLSearchParams(window.location.search);
    let urlNamespace = urlParams.get("namespace");
    if (
      urlNamespace === "" ||
      defaultNamespace === "" ||
      urlNamespace === "ALL"
    ) {
      setNamespace("ALL");
    } else if (namespace !== defaultNamespace) {
      setNamespace(defaultNamespace);
    }
  }, [namespaceOptions]);

  useEffect(() => {
    updateOptions();
  }, [namespace, context.currentCluster]);

  const handleSetActive = (namespace: any) => {
    setNamespace(namespace);
  };

  return (
    <StyledNamespaceSelector>
      <Label>
        <i className="material-icons">filter_alt</i> Namespace
      </Label>
      <Selector
        activeValue={namespace}
        setActiveValue={handleSetActive}
        options={namespaceOptions}
        dropdownLabel="Namespace"
        width="150px"
        dropdownWidth="230px"
        closeOverlay={true}
      />
    </StyledNamespaceSelector>
  );
};

const Label = styled.div`
  display: flex;
  align-items: center;
  margin-right: 12px;

  > i {
    margin-right: 8px;
    font-size: 18px;
  }
`;

const StyledNamespaceSelector = styled.div`
  display: flex;
  align-items: center;
  font-size: 13px;
`;
