import Modal from "components/porter/Modal";
import React from "react";
import Text from "components/porter/Text";
import Spacer from "components/porter/Spacer";
import ExpandableSection from "components/porter/ExpandableSection";
import Fieldset from "components/porter/Fieldset";
import styled from "styled-components";
import Button from "components/porter/Button";
import Input from "components/porter/Input";
import Select from "components/porter/Select";

interface GithubActionModalProps {
    closeModal: () => void;
}

const GithubActionModal: React.FC<GithubActionModalProps> = ({
    closeModal,
}) => {
    return (
        <Modal closeModal={closeModal}>
            <Text size={16}>
                Continuous Integration (CI) with GitHub Actions
            </Text>
            <Spacer height="15px" />
            <Text color="helper">
                In order to automatically update your services every time new code is pushed to your GitHub branch, the following file must exist in your Github repository:
            </Text>
            <Spacer y={1} />
            <ExpandableSection
                noWrapper
                expandText="[+] Show code"
                collapseText="[-] Hide code"
                Header={
                    <ModalHeader>./github/workflows/porter_deploy.yml</ModalHeader>
                }
                isInitiallyExpanded={true}
                ExpandedSection={
                    <>
                        <Spacer height="15px" />
                        <Fieldset background="#1b1d2688">
                            • Amazon Elastic Kubernetes Service (EKS) = $73/mo
                            <Spacer height="15px" />
                            • Amazon EC2:
                            <Spacer height="15px" />
                            <Tab />+ System workloads: t3.medium instance (2) = $60.74/mo
                            <Spacer height="15px" />
                            <Tab />+ Monitoring workloads: t3.large instance (1) = $60.74/mo
                            <Spacer height="15px" />
                            <Tab />+ Application workloads: t3.xlarge instance (1) = $121.47/mo
                        </Fieldset>
                    </>
                }
            />
            <Spacer y={1} />
            <Text color="helper">
                Porter can open a PR for you to approve and merge this file into your repository, or you can add it yourself. If you allow Porter to open a PR, you will be redirected to the PR in a new tab after hitting Complete below.
            </Text>
            <Spacer y={1} />
            <Select
                options={[
                    { label: "I authorize Porter to open a PR on my behalf", value: "I authorize Porter to open a PR on my behalf" },
                    { label: "I will copy the file into my repository myself", value: "I will copy the file into my repository myself" },
                ]}
                onChange={(x: any) => console.log(x)}
                width="100%"
            />
            <Button
                onClick={closeModal}
                width={"100%"}
            >
                Complete
            </Button>
        </Modal>
    )
}

export default GithubActionModal;

const Tab = styled.span`
  margin-left: 20px;
  height: 1px;
`;

const ModalHeader = styled.div`
  font-weight: 600;
  font-size: 20px;
  font-family: monospace; ;

`;