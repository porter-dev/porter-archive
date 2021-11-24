import { useContext, useEffect, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";

const useLastSeenPodStatus = ({
  podName,
  namespace,
}: {
  podName: string;
  namespace: string;
}) => {
  const [status, setCurrentStatus] = useState(null);
  const { currentProject, currentCluster } = useContext(Context);

  const getPodStatus = (status: any) => {
    if (
      status?.phase === "Pending" &&
      status?.containerStatuses !== undefined
    ) {
      return status.containerStatuses[0].state.waiting.reason;
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
            s.state?.waiting.reason === "CrashLoopBackOff"
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
      console.log(getPodStatus(res.data.status));

      setCurrentStatus(getPodStatus(res.data.status));
    } catch (error) {}
  };

  useEffect(() => {
    updatePods();
  }, [podName, namespace]);

  return {
    status,
  };
};

export default useLastSeenPodStatus;
