import React, { useMemo } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import Logs from "../../validate-apply/logs/Logs"
import {Service} from "../../validate-apply/metrics/MetricsSection"
import {
    defaultSerialized,
    deserializeService, ServiceWithName,
} from "lib/porter-apps/services";
import Error from "components/porter/Error";
import Button from "components/porter/Button";
import { useLatestRevision } from "../LatestRevisionContext";
import MetricsSection from "../../validate-apply/metrics/MetricsSection";

const MetricsTab: React.FC = () => {
    const { projectId, clusterId, latestProto , deploymentTargetId} = useLatestRevision();

    const appName = latestProto.name
    const services = Object.entries(latestProto.services).map(([name, service]): ServiceWithName => {
        return {
            name: name,
            service: service,
        }
    })

    // const services = serviceNames.map((serviceName) => {
    //     const service = latestProto.services[serviceName];
    //
    //     const serviceValues: Service  = {
    //         name: serviceName,
    //         kind: "",
    //         ingress_enabled: service.config.case === "webConfig" && !service.config.value.private,
    //         absolute_name: service.absoluteName === "" ? undefined : service.absoluteName,
    //     }
    //
    //     if (service.config.case === "webConfig") {
    //         serviceValues.kind = "web"
    //         if (service.config.value.autoscaling != null && service.config.value.autoscaling.enabled) {
    //             const autoscaling = service.config.value.autoscaling
    //             serviceValues.autoscaling = {
    //                 minReplicas: autoscaling.minInstances,
    //                 maxReplicas: autoscaling.maxInstances,
    //                 targetCPUUtilizationPercentage: autoscaling.cpuThresholdPercent,
    //                 targetMemoryUtilizationPercentage: autoscaling.memoryThresholdPercent,
    //             }
    //         }
    //     }
    //
    //     if (service.config.case === "workerConfig") {
    //         serviceValues.kind = "worker"
    //         if (service.config.value.autoscaling != null && service.config.value.autoscaling.enabled) {
    //             const autoscaling = service.config.value.autoscaling
    //             serviceValues.autoscaling = {
    //                 minReplicas: autoscaling.minInstances,
    //                 maxReplicas: autoscaling.maxInstances,
    //                 targetCPUUtilizationPercentage: autoscaling.cpuThresholdPercent,
    //                 targetMemoryUtilizationPercentage: autoscaling.memoryThresholdPercent,
    //             }
    //         }
    //     }
    //
    //     if (service.config.case === "jobConfig") {
    //         serviceValues.kind = "job"
    //     }
    //
    //     return serviceValues
    // })

    return (
        <>
            <MetricsSection
                projectId={projectId}
                clusterId={clusterId}
                appName={appName}
                services={services}
                deploymentTargetId={deploymentTargetId}
            />
        </>
    );
};

export default MetricsTab;
