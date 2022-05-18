import yaml from "js-yaml";
import { useContext, useEffect, useState } from "react";
import { useRouteMatch } from "react-router";
import api from "shared/api";
import { onlyInLeft } from "shared/array_utils";
import { Context } from "shared/Context";
import { useRouting } from "shared/routing";
import { ChartType, ChartTypeWithExtendedConfig } from "shared/types";

export const useChart = (oldChart: ChartType, closeChart: () => void) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [chart, setChart] = useState<ChartTypeWithExtendedConfig>(null);
  const { url: matchUrl } = useRouteMatch();

  const [status, setStatus] = useState<"ready" | "loading" | "deleting">(
    "loading"
  );

  const [saveStatus, setSaveStatus] = useState<
    "loading" | "successful" | string
  >("");

  const { pushFiltered, getQueryParam, pushQueryParams } = useRouting();

  useEffect(() => {
    const { namespace, name: chartName } = oldChart;
    setStatus("loading");

    const revision = getQueryParam("chart_revision");

    api
      .getChart<ChartTypeWithExtendedConfig>(
        "token",
        {},
        {
          id: currentProject?.id,
          cluster_id: currentCluster?.id,
          namespace,
          name: chartName,
          revision: Number(revision) ? Number(revision) : 0,
        }
      )
      .then((res) => {
        if (res?.data) {
          setChart(res.data);
        }
      })
      .finally(() => {
        setStatus("ready");
      });
  }, [oldChart, currentCluster, currentProject]);

  /**
   * Upgrade chart version
   */
  const upgradeChart = async () => {
    // convert current values to yaml
    let valuesYaml = yaml.dump({
      ...(chart.config as Object),
    });

    try {
      await api.upgradeChartValues(
        "<token>",
        {
          values: valuesYaml,
          version: chart.latest_version,
        },
        {
          id: currentProject.id,
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
        }
      );

      window.analytics?.track("Chart Upgraded", {
        chart: chart.name,
        values: valuesYaml,
      });
    } catch (err) {
      let parsedErr = err?.response?.data?.error;

      if (parsedErr) {
        err = parsedErr;
      }
      setCurrentError(parsedErr);

      window.analytics?.track("Failed to Upgrade Chart", {
        chart: chart.name,
        values: valuesYaml,
        error: err,
      });
    }
  };

  /**
   * Delete/Uninstall chart
   */
  const deleteChart = async () => {
    try {
      const syncedEnvGroups = chart.config?.container?.env?.synced || [];
      const removeApplicationToEnvGroupPromises = syncedEnvGroups.map(
        (envGroup: any) => {
          return api.removeApplicationFromEnvGroup(
            "<token>",
            {
              name: envGroup?.name,
              app_name: chart.name,
            },
            {
              project_id: currentProject.id,
              cluster_id: currentCluster.id,
              namespace: chart.namespace,
            }
          );
        }
      );
      try {
        await Promise.all(removeApplicationToEnvGroupPromises);
      } catch (error) {
        setCurrentError(
          "We coudln't remove the synced env group from the application, please remove it manually before uninstalling the chart, or try again."
        );
        return;
      }

      await api.uninstallTemplate(
        "<token>",
        {},
        {
          namespace: chart.namespace,
          name: chart.name,
          id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      );
      setStatus("ready");
      closeChart();
      return;
    } catch (error) {
      console.log(error);
      throw new Error("Couldn't uninstall the chart");
    }
  };

  /**
   * Update chart values
   */
  const updateChart = async (
    processValues: (
      chart: ChartType,
      oldChart?: ChartType
    ) => { yaml: string; metadata: any }
  ) => {
    setSaveStatus("loading");
    const { yaml: values, metadata } = processValues(chart, oldChart);

    const syncEnvGroups = metadata ? metadata["container.env"] : {};

    const addedEnvGroups = syncEnvGroups?.added || [];
    const deletedEnvGroups = syncEnvGroups?.deleted || [];

    const addApplicationToEnvGroupPromises = addedEnvGroups.map(
      (envGroup: any) => {
        return api.addApplicationToEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: chart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: chart.namespace,
          }
        );
      }
    );

    try {
      await Promise.all(addApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't sync the env group to the application, please try again."
      );
    }

    const removeApplicationToEnvGroupPromises = deletedEnvGroups.map(
      (envGroup: any) => {
        return api.removeApplicationFromEnvGroup(
          "<token>",
          {
            name: envGroup?.name,
            app_name: chart.name,
          },
          {
            project_id: currentProject.id,
            cluster_id: currentCluster.id,
            namespace: chart.namespace,
          }
        );
      }
    );
    try {
      await Promise.all(removeApplicationToEnvGroupPromises);
    } catch (error) {
      setCurrentError(
        "We coudln't remove the synced env group from the application, please try again."
      );
    }

    try {
      await api.upgradeChartValues(
        "<token>",
        {
          values,
        },
        {
          id: currentProject.id,
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
        }
      );

      setSaveStatus("successful");
      setTimeout(() => setSaveStatus(""), 500);
    } catch (err) {
      let parsedErr = err?.response?.data?.error;

      if (!parsedErr) {
        parsedErr = err;
      }
      setCurrentError(parsedErr);
      setSaveStatus("Couldn't process the request.");
      // throw new Error(parsedErr);
    }
  };

  /**
   * Refresh the chart data
   */
  const refreshChart = async () => {
    try {
      const newChart = await api
        .getChart(
          "<token>",
          {},
          {
            name: chart.name,
            revision: 0,
            namespace: chart.namespace,
            cluster_id: currentCluster.id,
            id: currentProject.id,
          }
        )
        .then((res) => res.data);

      pushQueryParams({
        chart_version: newChart.version,
      });

      setChart(newChart);
    } catch (error) {}
  };

  const loadChartWithSpecificRevision = async (revision: number) => {
    try {
      const newChart = await api
        .getChart(
          "<token>",
          {},
          {
            name: chart.name,
            revision: revision,
            namespace: chart.namespace,
            cluster_id: currentCluster.id,
            id: currentProject.id,
          }
        )
        .then((res) => res.data);

      pushQueryParams({
        chart_revision: newChart.version,
      });

      setChart(newChart);
    } catch (error) {}
  };

  return {
    chart,
    status,
    saveStatus,
    upgradeChart,
    deleteChart,
    updateChart,
    refreshChart,
    loadChartWithSpecificRevision,
  };
};
