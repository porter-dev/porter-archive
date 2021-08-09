import React, { useContext, useState, useEffect } from "react";
import { Context } from "../../../../shared/Context";
import api from "../../../../shared/api";
import styled from "styled-components";
import Loading from "../../../../components/Loading";

const Metrics: React.FC = () => {
  const { currentProject, currentCluster } = useContext(Context);
  const [loading, setLoading] = useState(true);
  const [detected, setDetected] = useState(false);
  const [metricsOptions, setMetricsOptions] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getCluster(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          cluster_id: currentCluster.id,
        }
      ),
      api.getPrometheusIsInstalled(
        "<token>",
        {
          cluster_id: currentCluster.id,
        },
        {
          id: currentProject.id,
        }
      ),
    ])
      .then(() => {
        setDetected(true);
        setMetricsOptions([
          ...metricsOptions,
          {
            value: "nginx:errors",
            label: "5XX Error Percentage",
          },
        ]);
        setLoading(false);
      })
      .catch(() => {
        setDetected(false);
        setLoading(false);
      });
  }, []);

  return loading ? (
    <LoadingWrapper>
      <Loading />
    </LoadingWrapper>
  ) : !detected ? (
    <p>
      This message displays when either there's no ingress controller or nginx
      is not installed
    </p>
  ) : (
    <>Loaded</>
  );
};

export default Metrics;

const LoadingWrapper = styled.div`
  padding: 30px 0px;
  display: flex;
  align-items: center;
  font-size: 13px;
  justify-content: center;
  color: #ffffff44;
`;
