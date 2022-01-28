import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import backArrow from "assets/back_arrow.png";
import TitleSection from "components/TitleSection";
import pr_icon from "assets/pull_request_icon.svg";
import { useRouteMatch, useLocation } from "react-router";
import DynamicLink from "components/DynamicLink";
import Loading from "components/Loading";
import { Context } from "shared/Context";
import api from "shared/api";
import github from "assets/github-white.png";
import { integrationList } from "shared/common";
import { Infrastructure } from "./InfrastructureList";

export const capitalize = (s: string) => {
  return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
};

type Props = {
  infra_id: number;
};

const ExpandedInfra: React.FunctionComponent<Props> = ({ infra_id }) => {
  const { params } = useRouteMatch<{ namespace: string }>();
  const context = useContext(Context);
  const [infra, setInfra] = useState<Infrastructure>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRepoTooltip, setShowRepoTooltip] = useState(false);

  const { currentProject, currentCluster, setCurrentError } = useContext(
    Context
  );

  const { search } = useLocation();
  let searchParams = new URLSearchParams(search);

  useEffect(() => {
    let isSubscribed = true;

    api
      .getInfraByID(
        "<token>",
        {},
        {
          project_id: currentProject.id,
          infra_id: infra_id,
        }
      )
      .then(({ data }) => {
        if (!isSubscribed) {
          return;
        }

        setInfra(data);
      })
      .catch((err) => {
        console.error(err);
        if (isSubscribed) {
          setHasError(true);
        }
      });
  }, [infra_id]);

  if (!infra) {
    return <Loading />;
  }

  return (
    <StyledExpandedChart>
      <HeaderWrapper>
        <BackButton to={"/cluster-dashboard?selected_tab=preview_environments"}>
          <BackButtonImg src={backArrow} />
        </BackButton>
        <Title icon={pr_icon} iconWidth="25px">
          Infrastructure
          <DeploymentImageContainer>
            <DeploymentTypeIcon src={integrationList.repo.icon} />
            <RepositoryName
              onMouseOver={() => {
                setShowRepoTooltip(true);
              }}
              onMouseOut={() => {
                setShowRepoTooltip(false);
              }}
            >
              Infra
            </RepositoryName>
            {showRepoTooltip && <Tooltip>Infra</Tooltip>}
          </DeploymentImageContainer>
          <TagWrapper>
            Namespace <NamespaceTag>namespacer</NamespaceTag>
          </TagWrapper>
        </Title>
        <InfoWrapper></InfoWrapper>
        <Flex>
          <Status>
            <StatusDot status={infra.status} />
            {capitalize(infra.status)}
          </Status>
          <Dot>•</Dot>
          <GHALink to={"google.com"} target="_blank">
            <img src={github} /> GitHub
            <i className="material-icons">open_in_new</i>
          </GHALink>
        </Flex>
        <LinkToActionsWrapper></LinkToActionsWrapper>
      </HeaderWrapper>
      <LineBreak />
    </StyledExpandedChart>
  );
};

export default ExpandedInfra;

const Flex = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
`;

const GHALink = styled(DynamicLink)`
  font-size: 13px;
  font-weight: 400;
  margin-left: 7px;
  color: #aaaabb;
  display: flex;
  align-items: center;

  :hover {
    text-decoration: underline;
    color: white;
  }

  > img {
    height: 16px;
    margin-right: 9px;
    margin-left: 5px;

    :text-decoration: none;
    :hover {
      text-decoration: underline;
      color: white;
    }
  }

  > i {
    margin-left: 7px;
    font-size: 17px;
  }
`;

const LineBreak = styled.div`
  width: calc(100% - 0px);
  height: 2px;
  background: #ffffff20;
  margin-bottom: 20px;
`;

const BackButton = styled(DynamicLink)`
  position: absolute;
  top: 0px;
  right: 0px;
  display: flex;
  width: 36px;
  cursor: pointer;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #ffffff55;
  border-radius: 100px;
  background: #ffffff11;

  :hover {
    background: #ffffff22;
    > img {
      opacity: 1;
    }
  }
`;

const BackButtonImg = styled.img`
  width: 16px;
  opacity: 0.75;
`;

const HeaderWrapper = styled.div`
  position: relative;
`;

const Dot = styled.div`
  margin-left: 9px;
  font-size: 14px;
  color: #ffffff33;
`;

const InfoWrapper = styled.div`
  display: flex;
  align-items: center;
  width: auto;
  justify-content: space-between;
`;

const TagWrapper = styled.div`
  height: 20px;
  font-size: 12px;
  display: flex;
  margin-left: 20px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff44;
  border: 1px solid #ffffff44;
  border-radius: 3px;
  padding-left: 5px;
  background: #26282e;
`;

const NamespaceTag = styled.div`
  height: 20px;
  margin-left: 6px;
  color: #aaaabb;
  background: #43454a;
  border-radius: 3px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0px 6px;
  padding-left: 7px;
  border-top-left-radius: 0px;
  border-bottom-left-radius: 0px;
`;

const Icon = styled.img`
  width: 100%;
`;

const StyledExpandedChart = styled.div`
  width: 100%;
  z-index: 0;
  animation: fadeIn 0.3s;
  animation-timing-function: ease-out;
  animation-fill-mode: forwards;
  display: flex;
  flex-direction: column;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const Title = styled(TitleSection)`
  font-size: 16px;
  margin-top: 4px;
`;

const Status = styled.span`
  font-size: 13px;
  display: flex;
  align-items: center;
  margin-left: 1px;
  min-height: 17px;
  color: #a7a6bb;
`;

const StatusDot = styled.div`
  width: 8px;
  height: 8px;
  background: ${(props: { status: string }) =>
    props.status === "created"
      ? "#4797ff"
      : props.status === "failed"
      ? "#ed5f85"
      : props.status === "completed"
      ? "#00d12a"
      : "#f5cb42"};
  border-radius: 20px;
  margin-left: 3px;
  margin-right: 15px;
`;

const PRLink = styled(DynamicLink)`
  margin-left: 0px;
  display: flex;
  margin-top: 1px;
  align-items: center;
  font-size: 13px;
  > i {
    font-size: 15px;
    margin-right: 10px;
  }
`;

const ChartListWrapper = styled.div`
  width: 100%;
  margin: auto;
  margin-top: 20px;
  padding-bottom: 125px;
`;

const LinkToActionsWrapper = styled.div`
  width: 100%;
  margin-top: 15px;
  margin-bottom: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DeploymentImageContainer = styled.div`
  height: 20px;
  font-size: 13px;
  position: relative;
  display: flex;
  margin-left: 15px;
  margin-bottom: -3px;
  align-items: center;
  font-weight: 400;
  justify-content: center;
  color: #ffffff66;
  padding-left: 5px;
`;

const DeploymentTypeIcon = styled(Icon)`
  width: 20px;
  margin-right: 10px;
`;

const RepositoryName = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 390px;
  position: relative;
  margin-right: 3px;
`;

const Tooltip = styled.div`
  position: absolute;
  left: -40px;
  top: 28px;
  min-height: 18px;
  max-width: calc(700px);
  padding: 5px 7px;
  background: #272731;
  z-index: 999;
  color: white;
  font-size: 12px;
  font-family: "Work Sans", sans-serif;
  outline: 1px solid #ffffff55;
  opacity: 0;
  animation: faded-in 0.2s 0.15s;
  animation-fill-mode: forwards;
  @keyframes faded-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

// import React, { useState } from "react";
// import styled from "styled-components";
// import { Infrastructure } from "./InfrastructureList";
// import { useRouteMatch } from "react-router";
// import DynamicLink from "components/DynamicLink";
// import aws from "assets/aws.png";
// import digitalOcean from "assets/do.png";
// import gcp from "assets/gcp.png";

// export const capitalize = (s: string) => {
//   return s.charAt(0).toUpperCase() + s.substring(1).toLowerCase();
// };

// const ExpandedInfra: React.FC<{ infra_id: number }> = ({ infra_id }) => {
//   const [showRepoTooltip, setShowRepoTooltip] = useState(false);
//   const { url: currentUrl } = useRouteMatch();

//   const readableDate = (s: string) => {
//     const ts = new Date(s);
//     const date = ts.toLocaleDateString();
//     const time = ts.toLocaleTimeString([], {
//       hour: "numeric",
//       minute: "2-digit",
//     });
//     return `${time} on ${date}`;
//   };

//   return (
//     <ExpandedInfraWrapper key={infra_id}>
//       <CardHeader>
//         <Icon src={aws} />
//         <BlockTitle>ECR Registry</BlockTitle>
//       </CardHeader>
//       <BlockDescription>Hosted in your own cloud.</BlockDescription>

//       {/* <TemplateTitle>{infra.kind}</TemplateTitle>
//       <DataContainer>
//         <Flex>
//           <StatusContainer>
//             <Status>
//               <StatusDot status={infra.status} />
//               {capitalize(infra.status)}
//             </Status>
//           </StatusContainer> */}
//       {/* <DeploymentImageContainer>
//             <DeploymentTypeIcon src={integrationList.repo.icon} />
//             <RepositoryName
//               onMouseOver={() => {
//                 setShowRepoTooltip(true);
//               }}
//               onMouseOut={() => {
//                 setShowRepoTooltip(false);
//               }}
//             >
//               {repository}
//             </RepositoryName>
//             {showRepoTooltip && <Tooltip>{repository}</Tooltip>}
//             <InfoWrapper>
//               <LastDeployed>
//                 Last updated {readableDate(deployment.updated_at)}
//               </LastDeployed>
//             </InfoWrapper>
//           </DeploymentImageContainer> */}
//       {/* </Flex>
//       </DataContainer> */}
//       {/* <Flex>
//         <RowButton
//           to={`${currentUrl}/infrastructure/${infra.id}`}
//           key={infra.id}
//         >
//           <i className="material-icons-outlined">info</i>
//           Details
//         </RowButton>
//       </Flex> */}
//     </ExpandedInfraWrapper>
//   );
// };

// export default ExpandedInfra;
// const Flex = styled.div`
//   display: flex;
//   align-items: center;
// `;

// const PRName = styled.div`
//   font-family: "Work Sans", sans-serif;
//   font-weight: 500;
//   color: #ffffff;
//   display: flex;
//   align-items: center;
//   margin-bottom: 10px;
// `;

// const ExpandedInfraWrapper = styled.div`
//   border: 1px solid #ffffff00;
//   align-items: center;
//   user-select: none;
//   border-radius: 8px;
//   display: flex;
//   font-size: 13px;
//   font-weight: 500;
//   padding: 3px 0px 5px;
//   flex-direction: column;
//   justify-content: space-between;
//   height: 200px;
//   cursor: pointer;
//   color: #ffffff;
//   position: relative;
//   background: #26282f;
//   box-shadow: 0 4px 15px 0px #00000044;
//   :hover {
//     background: #ffffff11;
//   }

//   animation: fadeIn 0.3s 0s;
//   @keyframes fadeIn {
//     from {
//       opacity: 0;
//     }
//     to {
//       opacity: 1;
//     }
//   }
// `;

// const TemplateTitle = styled.div`
//   margin-bottom: 12px;
//   width: 80%;
//   text-align: center;
//   font-size: 14px;
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
// `;

// const DataContainer = styled.div`
//   display: flex;
//   flex-direction: column;
//   justify-content: space-between;
// `;

// const StatusContainer = styled.div`
//   display: flex;
//   flex-direction: column;
//   justify-content: flex-start;
//   height: 100%;
// `;

// const PRIcon = styled.img`
//   font-size: 20px;
//   height: 17px;
//   margin-right: 10px;
//   color: #aaaabb;
//   opacity: 50%;
// `;

// const RowButton = styled(DynamicLink)`
//   font-size: 12px;
//   padding: 8px 10px;
//   margin-left: 10px;
//   border-radius: 5px;
//   color: #ffffff;
//   border: 1px solid #aaaabb;
//   display: flex;
//   align-items: center;
//   background: #ffffff08;
//   cursor: pointer;
//   :hover {
//     background: #ffffff22;
//   }

//   > i {
//     font-size: 14px;
//     margin-right: 8px;
//   }
// `;

// const Status = styled.span`
//   font-size: 13px;
//   display: flex;
//   align-items: center;
//   min-height: 17px;
//   color: #a7a6bb;
// `;

// const StatusDot = styled.div`
//   width: 8px;
//   height: 8px;
//   margin-right: 15px;
//   background: ${(props: { status: string }) =>
//     props.status === "created"
//       ? "#4797ff"
//       : props.status === "failed"
//       ? "#ed5f85"
//       : props.status === "completed"
//       ? "#00d12a"
//       : "#f5cb42"};
//   border-radius: 20px;
//   margin-left: 3px;
// `;

// const DeploymentImageContainer = styled.div`
//   height: 20px;
//   font-size: 13px;
//   position: relative;
//   display: flex;
//   margin-left: 15px;
//   align-items: center;
//   font-weight: 400;
//   justify-content: center;
//   color: #ffffff66;
//   padding-left: 5px;
// `;

// const RepositoryName = styled.div`
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
//   max-width: 390px;
//   position: relative;
//   margin-right: 3px;
// `;

// const Tooltip = styled.div`
//   position: absolute;
//   left: -20px;
//   top: 10px;
//   min-height: 18px;
//   max-width: calc(700px);
//   padding: 5px 7px;
//   background: #272731;
//   z-index: 999;
//   color: white;
//   font-size: 12px;
//   font-family: "Work Sans", sans-serif;
//   outline: 1px solid #ffffff55;
//   opacity: 0;
//   animation: faded-in 0.2s 0.15s;
//   animation-fill-mode: forwards;
//   @keyframes faded-in {
//     from {
//       opacity: 0;
//     }
//     to {
//       opacity: 1;
//     }
//   }
// `;

// const InfoWrapper = styled.div`
//   display: flex;
//   align-items: center;
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
//   margin-right: 8px;
// `;

// const LastDeployed = styled.div`
//   font-size: 13px;
//   margin-left: 14px;
//   margin-top: -1px;
//   display: flex;
//   align-items: center;
//   color: #aaaabb66;
// `;

// const Icon = styled.img<{ bw?: boolean }>`
//   height: 34px;
//   filter: ${(props) => (props.bw ? "grayscale(1)" : "")};
// `;

// const CardHeader = styled.div`
//   width: 100%;
//   display: flex;
//   align-items: center;
//   padding: 0 20px;
//   margin-top: 10px;
// `;

// const LastUpdatedSection = styled.div`
//   width: 100%;
//   color: #ffffff66;
//   text-align: right;
//   font-weight: default;
//   font-size: 12px;
//   overflow: hidden;
// `;

// const BlockDescription = styled.div`
//   color: #ffffff66;
//   text-align: center;
//   font-weight: default;
//   font-size: 13px;
//   padding: 0px 25px;
//   height: 2.4em;
//   font-size: 12px;
//   display: -webkit-box;
//   overflow: hidden;
//   -webkit-line-clamp: 2;
//   -webkit-box-orient: vertical;
// `;

// const BlockTitle = styled.div`
//   margin-bottom: 12px;
//   width: 80%;
//   text-align: center;
//   font-size: 14px;
//   white-space: nowrap;
//   overflow: hidden;
//   text-overflow: ellipsis;
// `;

// const Block = styled.div<{ disabled?: boolean }>`
//   align-items: center;
//   user-select: none;
//   border-radius: 5px;
//   display: flex;
//   font-size: 13px;
//   overflow: hidden;
//   font-weight: 500;
//   padding: 3px 0px 5px;
//   flex-direction: column;
//   align-items: center;
//   justify-content: space-between;
//   height: 170px;
//   cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
//   color: #ffffff;
//   position: relative;
//   background: #26282f;
//   box-shadow: 0 3px 5px 0px #00000022;
//   :hover {
//     background: ${(props) => (props.disabled ? "" : "#ffffff11")};
//   }
//   filter: ${({ disabled }) => (disabled ? "grayscale(1)" : "")};

//   animation: fadeIn 0.3s 0s;
//   @keyframes fadeIn {
//     from {
//       opacity: 0;
//     }
//     to {
//       opacity: 1;
//     }
//   }
// `;
