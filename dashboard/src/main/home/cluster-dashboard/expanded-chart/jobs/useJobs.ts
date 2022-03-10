import { set } from "lodash";
import { useContext, useEffect, useRef, useState } from "react";
import api from "shared/api";
import { Context } from "shared/Context";
import { NewWebsocketOptions, useWebsockets } from "shared/hooks/useWebsockets";
import { ChartType } from "shared/types";
import yaml from "js-yaml";
import { usePrevious } from "shared/hooks/usePrevious";

const PORTER_IMAGE_TEMPLATES = [
  "porterdev/hello-porter-job",
  "porterdev/hello-porter-job:latest",
  "public.ecr.aws/o1j4x7p4/hello-porter-job",
  "public.ecr.aws/o1j4x7p4/hello-porter-job:latest",
];

export const useJobs = (chart: ChartType) => {
  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );
  const [jobs, setJobs] = useState([]);
  const jobsRef = useRef([]);
  const [hasPorterImageTemplate, setHasPorterImageTemplate] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [triggerRunStatus, setTriggerRunStatus] = useState<
    "loading" | "successful" | string
  >("");

  const previousChart = usePrevious(chart, null);

  const {
    newWebsocket,
    openWebsocket,
    closeAllWebsockets,
    closeWebsocket,
  } = useWebsockets();

  const sortJobsAndSave = (newJobs: any[]) => {
    // Set job run from URL if needed
    const urlParams = new URLSearchParams(location.search);
    const urlJob = urlParams.get("job");

    const getTime = (job: any) => {
      return new Date(job?.status?.startTime).getTime();
    };

    newJobs.sort((job1, job2) => {
      // if (job1.metadata.name === urlJob) {
      //   this.setJobRun(job1);
      // } else if (job2.metadata.name === urlJob) {
      //   this.setJobRun(job2);
      // }

      return getTime(job2) - getTime(job1);
    });

    let latestImageDetected =
      newJobs[0]?.spec?.template?.spec?.containers[0]?.image;
    if (!PORTER_IMAGE_TEMPLATES.includes(latestImageDetected)) {
      // this.setState({ jobs, newestImage, imageIsPlaceholder: false });
      setHasPorterImageTemplate(false);
    }
    jobsRef.current = newJobs;
    setJobs(newJobs);
  };

  const mergeNewJob = (newJob: any) => {
    let newJobs = [...jobsRef.current];
    const existingJobIndex = newJobs.findIndex((currentJob) => {
      return (
        currentJob.metadata?.name === newJob.metadata?.name &&
        currentJob.metadata?.namespace === newJob.metadata?.namespace
      );
    });

    if (existingJobIndex > -1) {
      newJobs.splice(existingJobIndex, 1, newJob);
    } else {
      newJobs.push(newJob);
    }
    sortJobsAndSave(newJobs);
  };

  const removeJob = (deletedJob: any) => {
    let newJobs = jobsRef.current.filter((job: any) => {
      return deletedJob.metadata?.name !== job.metadata?.name;
    });

    sortJobsAndSave([...newJobs]);
  };

  const setupCronJobWebsocket = () => {
    const releaseName = chart.name;
    const releaseNamespace = chart.namespace;
    if (!releaseName || !releaseNamespace) {
      return;
    }

    const websocketId = `cronjob-websocket-${releaseName}`;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/cronjob/status`;

    const config: NewWebsocketOptions = {
      onopen: console.log,
      onmessage: (evt: MessageEvent) => {
        const event = JSON.parse(evt.data);
        const object = event.Object;
        object.metadata.kind = event.Kind;

        setHasPorterImageTemplate((prevValue) => {
          // if imageIsPlaceholder is true update the newestImage and imageIsPlaceholder fields

          if (event.event_type !== "ADD" && event.event_type !== "UPDATE") {
            return prevValue;
          }

          if (!hasPorterImageTemplate) {
            return prevValue;
          }

          if (!event.Object?.metadata?.annotations) {
            return prevValue;
          }

          // filter job belonging to chart
          const relNameAnnotation =
            event.Object?.metadata?.annotations["meta.helm.sh/release-name"];
          const relNamespaceAnnotation =
            event.Object?.metadata?.annotations[
              "meta.helm.sh/release-namespace"
            ];

          if (
            releaseName !== relNameAnnotation ||
            releaseNamespace !== relNamespaceAnnotation
          ) {
            return prevValue;
          }

          const newestImage =
            event.Object?.spec?.jobTemplate?.spec?.template?.spec?.containers[0]
              ?.image;

          if (!PORTER_IMAGE_TEMPLATES.includes(newestImage)) {
            return false;
          }

          return true;
        });
      },
      onclose: console.log,
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketId);
      },
    };

    newWebsocket(websocketId, endpoint, config);
    openWebsocket(websocketId);
  };

  const setupJobWebsocket = () => {
    const chartVersion = `${chart?.chart?.metadata?.name}-${chart?.chart?.metadata?.version}`;

    const websocketId = `job-websocket-${chart.name}`;

    const endpoint = `/api/projects/${currentProject.id}/clusters/${currentCluster.id}/job/status`;

    const config: NewWebsocketOptions = {
      onopen: console.log,
      onmessage: (evt: MessageEvent) => {
        const event = JSON.parse(evt.data);

        const chartLabel = event.Object?.metadata?.labels["helm.sh/chart"];
        const releaseLabel =
          event.Object?.metadata?.labels["meta.helm.sh/release-name"];

        if (chartLabel !== chartVersion || releaseLabel !== chart.name) {
          return;
        }

        // if event type is add or update, merge with existing jobs
        if (event.event_type === "ADD" || event.event_type === "UPDATE") {
          mergeNewJob(event.Object);
          return;
        }

        if (event.event_type === "DELETE") {
          // filter job belonging to chart
          removeJob(event.Object);
        }
      },
      onclose: console.log,
      onerror: (err: ErrorEvent) => {
        console.log(err);
        closeWebsocket(websocketId);
      },
    };
    newWebsocket(websocketId, endpoint, config);
    openWebsocket(websocketId);
  };

  useEffect(() => {
    let isSubscribed = true;

    if (!chart) {
      return () => {
        isSubscribed = false;
      };
    }

    if (
      previousChart?.name === chart?.name &&
      previousChart?.namespace === chart?.namespace
    ) {
      return () => {
        isSubscribed = false;
      };
    }

    setStatus("loading");
    const newestImage = chart?.config?.image?.repository;

    setHasPorterImageTemplate(PORTER_IMAGE_TEMPLATES.includes(newestImage));

    api
      .getJobs(
        "<token>",
        {},
        {
          id: currentProject?.id,
          cluster_id: currentCluster?.id,
          namespace: chart.namespace,
          release_name: chart.name,
        }
      )
      .then((res) => {
        if (isSubscribed) {
          sortJobsAndSave(res.data);
          setStatus("ready");
          setupJobWebsocket();
          setupCronJobWebsocket();
        }
      });
    return () => {
      isSubscribed = false;
    };
  }, [chart]);

  useEffect(() => {
    return () => {
      closeAllWebsockets();
    };
  }, []);

  const runJob = () => {
    setTriggerRunStatus("loading");
    const config = chart.config;
    const values = {};

    for (let key in config) {
      set(values, key, config[key]);
    }

    set(values, "paused", false);

    const yamlValues = yaml.dump(
      {
        ...values,
      },
      { forceQuotes: true }
    );

    api
      .upgradeChartValues(
        "<token>",
        {
          values: yamlValues,
        },
        {
          id: currentProject.id,
          name: chart.name,
          namespace: chart.namespace,
          cluster_id: currentCluster.id,
        }
      )
      .then((res) => {
        setTriggerRunStatus("successful");
        setTimeout(() => setTriggerRunStatus(""), 500);
      })
      .catch((err) => {
        let parsedErr = err?.response?.data?.error;

        if (parsedErr) {
          err = parsedErr;
        }

        // this.setState({
        //   saveValuesStatus: parsedErr,
        // });
        setTriggerRunStatus("Couldn't trigger a new run for this job.");
        setTimeout(() => setTriggerRunStatus(""), 500);
        setCurrentError(parsedErr);
      });
  };

  return {
    jobs,
    hasPorterImageTemplate,
    status,
    triggerRunStatus,
    runJob,
    selectedJob,
    setSelectedJob,
  };
};
