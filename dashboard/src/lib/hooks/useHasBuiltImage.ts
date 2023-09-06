import { useQuery } from "@tanstack/react-query";
import { ImageInfo } from "main/home/app-dashboard/new-app-flow/serviceTypes";
import { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";

export const useHasBuiltImage = (appName: string | undefined) => {
    const { currentProject, currentCluster } = useContext(Context);
    const [hasBuiltImage, setHasBuiltImage] = useState<boolean>(false);

    const { data } = useQuery(
        ["checkForBuiltImage", currentProject?.id, currentCluster?.id, hasBuiltImage],
        async () => {
            if (currentProject == null || currentCluster == null || appName == null) {
                return false;
            }

            const resChartData = await api.getChart(
                "<token>",
                {},
                {
                    id: currentProject.id,
                    namespace: `porter-stack-${appName}`,
                    cluster_id: currentCluster.id,
                    name: appName,
                    revision: 0,
                }
            );
            const globalImage = resChartData.data.config?.global?.image
            return globalImage != null &&
                globalImage.repository != null &&
                globalImage.tag != null &&
                !(globalImage.repository === ImageInfo.BASE_IMAGE.repository &&
                    globalImage.tag === ImageInfo.BASE_IMAGE.tag)
        },
        {
            enabled: !!currentProject && !!currentCluster && !hasBuiltImage,
            refetchOnWindowFocus: false,
            refetchInterval: 5000,
        }
    );

    useEffect(() => {
        if (data != null) {
            setHasBuiltImage(data);
        }
    }, [data]);

    return hasBuiltImage;
} 