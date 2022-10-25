import React, { useContext, useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import folder from "assets/folder-outline.svg";

import { Context } from "shared/Context";
import api from "shared/api";

import RadioFilter from "components/RadioFilter";

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
  const [defaultNamespace, setDefaultNamespace] = useState<string>(
    localStorage.getItem(
      `${context.currentProject.id}-${context.currentCluster.id}-namespace`
    )
  );

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
          if (
            localStorage.getItem(
              `${context.currentProject.id}-${context.currentCluster.id}-namespace`
            )
          ) {
            setDefaultNamespace(
              localStorage.getItem(
                `${context.currentProject.id}-${context.currentCluster.id}-namespace`
              )
            );
          } else {
            setDefaultNamespace("default");
          }
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

  useEffect(() => {
    setNamespace(
      localStorage.getItem(
        `${context.currentProject.id}-${context.currentCluster.id}-namespace`
      )
    );
  }, [context.currentCluster]);

  const handleSetActive = (namespace: any) => {
    localStorage.setItem(
      `${context.currentProject.id}-${context.currentCluster.id}-namespace`,
      namespace
    );
    setNamespace(namespace);
  };

  return (
    <RadioFilter
      icon={folder}
      selected={namespace}
      setSelected={handleSetActive}
      options={namespaceOptions}
      name="Namespace"
    />
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