import React, { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";

const AlertingSettings = () => {
  const { currentCluster, currentProject } = useContext(Context);

  const [alertingConfig, setAlertingConfig] = useState<AlertingBackend[]>([]);

  useEffect(() => {
    let isSubscribed = true;
    api
      .getAlertingConfig<AlertingConfigResponse>(
        "<token>",
        {},
        {
          project_id: currentProject?.id,
          cluster_id: currentCluster?.id,
        }
      )
      .then((res) => {
        if (!isSubscribed) {
          return;
        }
        const alertingConfig = res.data?.backends;

        setAlertingConfig(alertingConfig || []);
      });

    return () => {
      isSubscribed = false;
    };
  }, [currentProject, currentCluster]);

  return <div>AlertingSettings</div>;
};

export default AlertingSettings;
/**
 * "backends": [
		{
			"name": String, // eg: "prometheus"
			"actions": [
				{
					"id": String, // eg: "KubernetesNodeReady"
					"description": String, // eg: "Alert when a cluster node is unavailable"
					"type": String, // eg :"toggle" || "string_input" || "integer_input"
					"value": Boolean || String || Int // eg: false
				},
				{
					...
				}
			],
		},
 */

type AlertingConfigResponse = {
  backends: AlertingBackend[];
};

type AlertingBackend = {
  name: string;
  actions: AlertingAction[];
};

type AlertingAction = {
  id: string;
  description: string;
  type: "toggle" | "string_input" | "integer_input";
};
