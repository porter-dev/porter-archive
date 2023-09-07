import { useQuery } from "@tanstack/react-query";
import { useContext, useEffect, useState } from "react";
import { Context } from "shared/Context";
import api from "shared/api";
import { z } from "zod";
import {AppRevision, appRevisionValidator} from "../revisions/types";
import {useLatestRevision} from "../../main/home/app-dashboard/app-view/LatestRevisionContext";

export function useRevisionList(appName: string, deploymentTargetId: string) {
  const { currentProject, currentCluster } = useContext(Context);
  const {latestRevision} = useLatestRevision();

  const [
    revisionList,
    setRevisionList,
  ] = useState<AppRevision[]>([]);

  if (currentProject == null || currentCluster == null) {
    return [];
  }

  const {data} = useQuery(
      ["listAppRevisions", currentProject.id, currentCluster.id, appName, deploymentTargetId, latestRevision],
      async () => {
        const res = await api.listAppRevisions(
            "<token>",
            {
              deployment_target_id: deploymentTargetId,
            },
            {
              project_id: currentProject.id,
              cluster_id: currentCluster.id,
              porter_app_name: appName,
            }
        );

        const revisions = await z
            .object({
              app_revisions: z.array(appRevisionValidator),
            })
            .parseAsync(res.data);

        return revisions;
      }
  );

  useEffect(() => {
    if (data) {
      setRevisionList(data.app_revisions);
    }
  }, [data]);

  return revisionList;
}

export function useRevisionIdToNumber(appName: string, deploymentTargetId: string) {
    const revisionList = useRevisionList(appName, deploymentTargetId);
    const revisionIdToNumber: Record<string, number> = Object.fromEntries(revisionList.map(r => ([r.id, r.revision_number ])))

    return revisionIdToNumber;
}

export function useLatestRevisionNumber(appName: string, deploymentTargetId: string) {
  const revisionList = useRevisionList(appName, deploymentTargetId);
  return revisionList.map((revision) => revision.revision_number).reduce((a, b) => Math.max(a, b), 0)
}
