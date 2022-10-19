export const getPodStatus = (status: any) => {
  if (status?.phase === "Pending" && status?.containerStatuses !== undefined) {
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
      } else if (
        s.state?.terminated &&
        (s.state.terminated?.exitCode !== 0 ||
          s.state.terminated?.reason !== "Completed")
      ) {
        collatedStatus = "failed";
      }
    });
    return collatedStatus;
  }
};

export const getAvailability = (kind: string, c: any) => {
  switch (kind?.toLowerCase()) {
    case "deployment":
    case "replicaset":
      return [
        c.status?.availableReplicas ||
          c.status?.replicas - c.status?.unavailableReplicas ||
          0,
        c.status?.replicas || 0,
      ];
    case "statefulset":
      return [c.status?.readyReplicas || 0, c.status?.replicas || 0];
    case "daemonset":
      return [
        c.status?.numberAvailable || 0,
        c.status?.desiredNumberScheduled || 0,
      ];
    case "job":
      return [1, 1];
  }
};
