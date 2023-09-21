import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import api from "shared/api";
import { z } from "zod";
import { AppRevision, appRevisionValidator } from "../revisions/types";
import { useLatestRevision } from "main/home/app-dashboard/app-view/LatestRevisionContext";

export function useRevisionList({
  appName,
  deploymentTargetId,
  projectId,
  clusterId,
}: {
  appName: string,
  deploymentTargetId: string,
  projectId: number,
  clusterId: number
}): { revisionList: AppRevision[], revisionIdToNumber: Record<string, number> } {
  const [
    revisionList,
    setRevisionList,
  ] = useState<AppRevision[]>([]);
  const [revisionIdToNumber, setRevisionIdToNumber] = useState<Record<string, number>>({});
  const { latestRevision } = useLatestRevision();

  const { data } = useQuery(
    ["listAppRevisions", projectId, clusterId, appName, deploymentTargetId, latestRevision],
    async () => {
      const res = await api.listAppRevisions(
        "<token>",
        {
          deployment_target_id: deploymentTargetId,
        },
        {
          project_id: projectId,
          cluster_id: clusterId,
          porter_app_name: appName,
        }
      );

      const revisions = await z
        .object({
          app_revisions: z.array(appRevisionValidator),
        })
        .parseAsync(res.data);
      return revisions;
    },
    {
      refetchInterval: 5000,
      refetchOnWindowFocus: false,
    }
  );

  useEffect(() => {
    if (data) {
      const revisionList = data.app_revisions
      setRevisionList(revisionList);
      setRevisionIdToNumber(Object.fromEntries(revisionList.map(r => ([r.id, r.revision_number]))))
    }
  }, [data]);

  return { revisionList, revisionIdToNumber };
}
