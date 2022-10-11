import { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";

const useLastSeenPodStatus = ({
  podName,
  namespace,
  resource_type,
}: {
  podName: string;
  namespace: string;
  resource_type: string;
}) => {
  const [status, setCurrentStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const { currentProject, currentCluster } = useContext(Context);

  const getPodStatus = (status: any) => {
    if (
      status?.phase === "Pending" &&
      status?.containerStatuses !== undefined
    ) {
      return status.containerStatuses[0].state?.waiting?.reason || "Pending";
    } else if (status?.phase === "Pending") {
      return "Pending";
    }

    if (status?.phase === "Failed") {
      return "failed";
    }

    if (status?.phase === "Running") {
      let collatedStatus = "running";

      status?.containerStatuses?.forEach((s: any) => {
        if (s.state?.waiting) {
          collatedStatus =
            s.state?.waiting?.reason === "CrashLoopBackOff"
              ? "failed"
              : "waiting";
        } else if (s.state?.terminated) {
          collatedStatus = "failed";
        }
      });
      return collatedStatus;
    }
  };

  const updatePods = async () => {
    try {
      const res = await api.getPodByName(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
          namespace: "default",
          name: podName,
        }
      );
      // console.log(getPodStatus(res.data.status));

      setCurrentStatus(getPodStatus(res.data.status));
    } catch (error) {
      if (error?.response?.status === 404) {
        setCurrentStatus("Deleted");
      } else {
        setHasError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (resource_type?.toLowerCase() === "pod") {
      updatePods();
    }
  }, [podName, namespace, resource_type]);

  return {
    status,
    isLoading,
    hasError,
  };
};

export default useLastSeenPodStatus;
