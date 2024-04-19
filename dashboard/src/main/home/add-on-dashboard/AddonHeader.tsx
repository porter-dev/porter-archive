import React, { useMemo } from "react";
import styled from "styled-components";
import { match } from "ts-pattern";

import Container from "components/porter/Container";
import Spacer from "components/porter/Spacer";
import Text from "components/porter/Text";
import Tooltip from "components/porter/Tooltip";
import TitleSection from "components/TitleSection";
import { prefixSubdomain } from "lib/porter-apps/services";

import { useAddonContext } from "./AddonContextProvider";

const AddonHeader: React.FC = () => {
  const { addon, status } = useAddonContext();

  const domain = useMemo(() => {
    return match(addon.config)
      .with({ type: "metabase" }, (config) => {
        return config.customDomain || config.porterDomain;
      })
      .otherwise(() => "");
  }, [addon]);

  return (
    <HeaderWrapper>
      <TitleSection icon={addon.template.icon} iconWidth="33px">
        {addon.name.value}
      </TitleSection>
      {domain && (
        <>
          <Spacer y={0.5} />
          <Container>
            <Text>
              <a
                href={prefixSubdomain(domain)}
                target="_blank"
                rel="noreferrer"
              >
                {domain}
              </a>
            </Text>
          </Container>
        </>
      )}
      <Spacer y={0.5} />
      <div>
        <Container row>
          <Text size={16}>Deploy status</Text>
          <Spacer x={1} inline />
          {status.isLoading ? (
            <Text color="helper">Initializing...</Text>
          ) : status.pods.every((p) => p.status === "running") ? (
            <Text color="#01a05d">Deployed</Text>
          ) : status.pods.some((p) => p.status === "failed") ? (
            <Text color="#E1322E">Failed</Text>
          ) : (
            <Text color="#E49621">Deploying</Text>
          )}
        </Container>
        <Spacer y={0.5} />
        {status.isLoading ? (
          <LoadingBars />
        ) : (
          <StatusBars>
            {status.pods.map((p, i) => {
              return (
                <Tooltip
                  key={p.name}
                  content={
                    <Container>
                      <Container row>
                        <Text>{`Pod: ${p.name}`}</Text>
                      </Container>
                      <Spacer y={0.5} />
                      <Container row>
                        <Text color="gray">{p.status}</Text>
                      </Container>
                    </Container>
                  }
                  position="right"
                >
                  <div style={{ width: "20px" }}>
                    <Bar
                      isFirst={i === 0}
                      isLast={i === status.pods.length - 1}
                      status={p.status}
                      animate={p.status === "pending"}
                    />
                  </div>
                </Tooltip>
              );
            })}
          </StatusBars>
        )}
      </div>
    </HeaderWrapper>
  );
};

export default AddonHeader;

const HeaderWrapper = styled.div`
  position: relative;
`;

// const InfoWrapper = styled.div`
//   display: flex;
//   align-items: center;
//   margin-left: 3px;
//   margin-top: 22px;
// `;

// const StyledDeployStatusSection = styled.div<{ isExpanded?: boolean }>`
//   font-size: 13px;
//   height: 30px;
//   border-radius: 5px;
//   padding: 0 9px;
//   padding-left: 7px;
//   display: flex;
//   margin-left: -1px;
//   align-items: center;
//   ${(props) =>
//     props.isExpanded &&
//     `
//   background: #26292e;
//   border: 1px solid #494b4f;
//   border: 1px solid #7a7b80;
//   margin-left: -2px;
//   margin-right: -1px;
//   `}
//   justify-content: center;
// `;

// const StatusWrapper = styled.div`
//   display: flex;
//   justify-content: space-between;
//   align-items: center;
//   gap: 8px;
// `;

// const StatusCircle = styled.div<{ percentage: number }>`
//   width: 16px;
//   height: 16px;
//   border-radius: 50%;
//   margin-right: 10px;
//   background: ${(props) =>
//     `conic-gradient(
//       from 0deg,
//       #4797ff ${props.percentage}%,
//       #ffffffaa 0% ${props.percentage}%
//     )`};
// `;

const getBackgroundGradient = (status: string): string => {
  switch (status) {
    case "loading":
      return "linear-gradient(#76767644, #76767622)";
    case "running":
      return "linear-gradient(#01a05d, #0f2527)";
    case "failed":
      return "linear-gradient(#E1322E, #25100f)";
    case "pending":
      return "linear-gradient(#E49621, #25270f)";
    default:
      return "linear-gradient(#76767644, #76767622)"; // Default or unknown status
  }
};

const Bar = styled.div<{
  isFirst: boolean;
  isLast: boolean;
  status: string;
  animate?: boolean;
}>`
  height: 20px;
  max-width: 20px;
  display: flex;
  flex: 1;
  border-top-left-radius: ${(props) => (props.isFirst ? "5px" : "0")};
  border-bottom-left-radius: ${(props) => (props.isFirst ? "5px" : "0")};
  border-top-right-radius: ${(props) => (props.isLast ? "5px" : "0")};
  border-bottom-right-radius: ${(props) => (props.isLast ? "5px" : "0")};
  background: ${(props) => getBackgroundGradient(props.status)};
  ${(props) =>
    props.animate
      ? "animation: loadingAnimation 1.5s infinite;"
      : "animation: fadeIn 0.3s 0s;"}
  @keyframes loadingAnimation {
    0% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.3;
    }
  }
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const StatusBars = styled.div`
  display: flex;
  gap: 2px;
`;

const LoadingBars: React.FC = () => {
  return (
    <StyledLoadingBars>
      {Array.from({ length: 5 }).map((_, i) => (
        <Bar
          key={i}
          isFirst={i === 0}
          isLast={i === 4}
          status="loading"
          animate
        />
      ))}
    </StyledLoadingBars>
  );
};

const StyledLoadingBars = styled.div`
  display: flex;
  gap: 2px;
`;
