import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { ChartTypeWithExtendedConfig, StorageType } from "shared/types";

import MetricsBase from "./MetricsBase";

type PropsType = {
  currentChart: ChartTypeWithExtendedConfig;
};

type Controller = {
  metadata: {
    name: string;
    namespace: string;
  };
  kind: string;
};

const MetricsSection: React.FunctionComponent<PropsType> = ({
  currentChart,
}) => {
  const [controllerOptions, setControllerOptions] = useState<Controller[]>([]);
  const { currentCluster, currentProject } = useContext(Context);

  useEffect(() => {
    if (currentCluster == null || currentProject == null) {
      return;
    }
    api
      .getChartControllers(
        "<token>",
        {},
        {
          id: currentProject.id,
          name: currentChart.name,
          namespace: currentChart.namespace,
          cluster_id: currentCluster.id,
          revision: currentChart.version,
        }
      )
      .then((res) => {
        const controllerOptions = res.data.map((controller: Controller) => {
          return controller;
        });

        setControllerOptions(controllerOptions);
      })
      .catch((err) => {
        console.log(JSON.stringify(err));
        setControllerOptions([]);
      });
  }, [currentChart, currentCluster, currentProject]);

  return (
    <MetricsBase
      services={controllerOptions.map((c) => ({
        name: c.metadata.name,
        kind: c.kind,
        namespace: c.metadata.namespace,
      }))}
      timeRangeOptions={["1H", "6H", "1D", "1M"]}
      initialMetricsOptions={["cpu", "memory", "network"]}
      autoscaling_enabled={currentChart?.config?.autoscaling?.enabled}
      project_id={currentProject ? currentProject.id : 0}
      cluster_id={currentCluster ? currentCluster.id : 0}
    />
  );
};

export default MetricsSection;
